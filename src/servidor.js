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
      if (bruto.length > 1e5) reject(new Error('corpo muito grande'));
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

  async function api(req, res, url) {
    const rota = `${req.method} ${url.pathname}`;

    if (rota === 'GET /api/saude') return responderJson(res, 200, { status: 'ok' });

    if (rota === 'POST /api/login') {
      const { usuario, senha } = await lerCorpo(req);
      const token = auth.login(usuario, senha);
      if (!token) return responderJson(res, 401, { erro: 'Login ou senha inválidos.' });
      return responderJson(res, 200, { token, usuario });
    }

    const token = tokenDe(req);
    if (!auth.validar(token)) return responderJson(res, 401, { erro: 'Sessão inválida ou expirada.' });

    if (rota === 'POST /api/logout') {
      auth.logout(token);
      return responderJson(res, 204);
    }

    if (rota === 'GET /api/simulacoes') return responderJson(res, 200, repo.listar());

    if (rota === 'POST /api/simulacoes') {
      const dados = await lerCorpo(req);
      const avaliacao = avaliarEmprestimo(dados);
      if (avaliacao.resultado === 'DADOS_INVALIDOS') {
        return responderJson(res, 400, { erro: 'Dados inválidos.' });
      }
      const registro = repo.adicionar({
        idade: Number(dados.idade),
        renda: Number(dados.renda),
        valor: Number(dados.valor),
        conta: dados.conta,
        ...avaliacao,
      });
      return responderJson(res, 201, registro);
    }

    const exclusao = url.pathname.match(/^\/api\/simulacoes\/(\d+)$/);
    if (req.method === 'DELETE' && exclusao) {
      const removido = repo.remover(Number(exclusao[1]));
      return removido ? responderJson(res, 204) : responderJson(res, 404, { erro: 'Simulação não encontrada.' });
    }

    return responderJson(res, 404, { erro: 'Rota não encontrada.' });
  }

  function estatico(req, res, url) {
    const relativo = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const arquivo = path.normalize(path.join(pastaPublica, relativo));
    if (!arquivo.startsWith(pastaPublica) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    fs.createReadStream(arquivo).pipe(res);
  }

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);
      return estatico(req, res, url);
    } catch (erro) {
      return responderJson(res, 400, { erro: erro.message });
    }
  });
  servidor.repositorio = repo;
  return servidor;
}

if (require.main === module) {
  const porta = Number(process.env.PORT) || 3000;
  criarServidor().listen(porta, () => {
    console.log(`Simulador de Empréstimo em http://localhost:${porta}`);
  });
}

module.exports = { criarServidor };
