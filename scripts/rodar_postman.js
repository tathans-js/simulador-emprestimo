'use strict';
/* Executa a coleção Postman com Newman contra um servidor local isolado (dados temporários). */
const path = require('node:path');
const newman = require('newman');
const { iniciarServidor } = require('../tests/apoio/servidor');

const raiz = path.join(__dirname, '..');
const saida = path.join(raiz, 'resultados', 'postman');

(async () => {
  const srv = await iniciarServidor();
  newman.run({
    collection: path.join(raiz, 'postman', 'simulador-emprestimo.postman_collection.json'),
    environment: path.join(raiz, 'postman', 'local.postman_environment.json'),
    envVar: [{ key: 'baseUrl', value: srv.url }],
    reporters: ['cli', 'junit', 'json'],
    reporter: {
      junit: { export: path.join(saida, 'newman-junit.xml') },
      json: { export: path.join(saida, 'newman-relatorio.json') },
    },
  }, async (erro, resumo) => {
    await srv.parar();
    const falhas = erro ? 1 : resumo.run.failures.length;
    process.exitCode = falhas ? 1 : 0;
  });
})();
