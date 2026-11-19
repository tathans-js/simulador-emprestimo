'use strict';
/**
 * Servidor HTTP do Simulador de Empréstimo (sem dependências externas).
 *  - Arquivos estáticos da interface em /public
 *  - API REST em /api
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { avaliarEmprestimo } = require('./regras');
const { criarRepositorio } = require('./repositorio');
const { criarAutenticacao } = require('./auth');

const HTTP = { OK: 200, CRIADO: 201, SEM_CONTEUDO: 204, REQUISICAO_INVALIDA: 400, NAO_AUTORIZADO: 401, NAO_ENCONTRADO: 404 };
const LIMITE_CORPO_BYTES = 100000;
const PORTA_PADRAO = 3000;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

function responderJson(res, status, corpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(corpo === undefined ? '' : JSON.stringify(corpo));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', (parte) => {
      bruto += parte;
      if (bruto.length > LIMITE_CORPO_BYTES) reject(new Error('corpo muito grande'));
    });
    req.on('end', () => {
      if (!bruto) return resolve({});
      try { resolve(JSON.parse(bruto)); } catch { reject(new Error('JSON inválido')); }
    });
  });
}

function criarServidor(opcoes = {}) {
  const arquivoDados = opcoes.arquivoDados || process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'simulacoes.json');
  const pastaPublica = path.join(__dirname, '..', 'public');
  const repo = criarRepositorio(arquivoDados);
  const auth = criarAutenticacao({
    usuario: opcoes.usuario || process.env.APP_USUARIO || 'admin',
    senha: opcoes.senha || process.env.APP_SENHA || '1234',
  });

  function tokenDe(req) {
    const cab = req.headers.authorization || '';
    return cab.startsWith('Bearer ') ? cab.slice(7) : null;
  }

  const rotas = {
    'GET /api/saude': (req, res) => responderJson(res, HTTP.OK, { status: 'ok' }),

    'POST /api/login': async (req, res) => {
      const { usuario, senha } = await lerCorpo(req);
      const token = auth.login(usuario, senha);
      if (!token) return responderJson(res, HTTP.NAO_AUTORIZADO, { erro: 'Login ou senha inválidos.' });
      return responderJson(res, HTTP.OK, { token, usuario });
    },

    'POST /api/logout': (req, res) => {
      auth.logout(tokenDe(req));
      return responderJson(res, HTTP.SEM_CONTEUDO);
    },

    'GET /api/simulacoes': (req, res) => responderJson(res, HTTP.OK, repo.listar()),

    'POST /api/simulacoes': async (req, res) => {
      const dados = await lerCorpo(req);
      const avaliacao = avaliarEmprestimo(dados);
      if (avaliacao.resultado === 'DADOS_INVALIDOS') {
        return responderJson(res, HTTP.REQUISICAO_INVALIDA, { erro: 'Dados inválidos.' });
      }
      const registro = repo.adicionar({
        idade: Number(dados.idade), renda: Number(dados.renda), valor: Number(dados.valor), conta: dados.conta, ...avaliacao,
      });
      return responderJson(res, HTTP.CRIADO, registro);
    },

    'DELETE /api/simulacoes/:id': (req, res, id) => (repo.remover(id)
      ? responderJson(res, HTTP.SEM_CONTEUDO)
      : responderJson(res, HTTP.NAO_ENCONTRADO, { erro: 'Simulação não encontrada.' })),
  };
  const ROTAS_PUBLICAS = new Set(['GET /api/saude', 'POST /api/login']);

  function localizarRota(metodo, caminho) {
    const exata = `${metodo} ${caminho}`;
    if (rotas[exata]) return { chave: exata, parametro: null };
    const comId = caminho.match(/^\/api\/simulacoes\/(\d+)$/);
    if (comId && rotas[`${metodo} /api/simulacoes/:id`]) return { chave: `${metodo} /api/simulacoes/:id`, parametro: Number(comId[1]) };
    return null;
  }

  async function api(req, res, url) {
    const rota = localizarRota(req.method, url.pathname);
    if (!rota) return responderJson(res, HTTP.NAO_ENCONTRADO, { erro: 'Rota não encontrada.' });
    if (!ROTAS_PUBLICAS.has(rota.chave) && !auth.validar(tokenDe(req))) {
      return responderJson(res, HTTP.NAO_AUTORIZADO, { erro: 'Sessão inválida ou expirada.' });
    }
    return rotas[rota.chave](req, res, rota.parametro);
  }

  function estatico(req, res, url) {
    const relativo = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const arquivo = path.normalize(path.join(pastaPublica, relativo));
    if (!arquivo.startsWith(pastaPublica) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      res.writeHead(HTTP.NAO_ENCONTRADO, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    res.writeHead(HTTP.OK, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  }

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return estatico(req, res, url);
    } catch (erro) {
      return responderJson(res, HTTP.REQUISICAO_INVALIDA, { erro: erro.message });
    }
  });
  servidor.repositorio = repo;
  return servidor;
}

if (require.main === module) {
  const porta = Number(process.env.PORT) || PORTA_PADRAO;
  criarServidor().listen(porta, () => {
    console.log(`Simulador de Empréstimo em http://localhost:${porta}`);
  });
}

module.exports = { criarServidor };
