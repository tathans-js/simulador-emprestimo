'use strict';
/* Sobe o servidor em porta livre com arquivo de dados temporário (isolamento entre testes). */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { criarServidor } = require('../../src/servidor');

async function iniciarServidor(arquivoDados) {
  const arquivo = arquivoDados || path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'emprestimo-')), 'dados.json');
  const servidor = criarServidor({ arquivoDados: arquivo });
  await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
  const { port } = servidor.address();
  return {
    url: `http://127.0.0.1:${port}`,
    arquivo,
    servidor,
    parar: () => new Promise((resolve) => { servidor.closeAllConnections(); servidor.close(resolve); }),
  };
}

module.exports = { iniciarServidor };
