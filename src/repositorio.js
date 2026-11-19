'use strict';
/**
 * Persistência das simulações em arquivo JSON.
 * Escrita atômica (arquivo temporário + rename) para não corromper os dados.
 */
const fs = require('node:fs');
const path = require('node:path');

function criarRepositorio(arquivo) {
  function ler() {
    if (!fs.existsSync(arquivo)) return { proximoId: 1, simulacoes: [] };
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  }

  function gravar(dados) {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    const tmp = `${arquivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
    fs.renameSync(tmp, arquivo);
  }

  return {
    listar() {
      return ler().simulacoes;
    },
    adicionar(simulacao) {
      const dados = ler();
      const registro = { id: dados.proximoId, ...simulacao, criadoEm: new Date().toISOString() };
      dados.proximoId += 1;
      dados.simulacoes.push(registro);
      gravar(dados);
      return registro;
    },
    remover(id) {
      const dados = ler();
      const antes = dados.simulacoes.length;
      dados.simulacoes = dados.simulacoes.filter((s) => s.id !== id);
      if (dados.simulacoes.length === antes) return false;
      gravar(dados);
      return true;
    },
    limpar() {
      gravar({ proximoId: 1, simulacoes: [] });
    },
  };
}

module.exports = { criarRepositorio };
