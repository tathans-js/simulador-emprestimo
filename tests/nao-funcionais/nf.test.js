'use strict';
/*
 * Testes não funcionais (ambiente local controlado, sem testes destrutivos).
 * Categorias: Desempenho, Compatibilidade, Segurança básica e Confiabilidade.
 * As medições são gravadas em resultados/nao-funcionais/nf-resultados.json.
 */
const fs = require('node:fs');
const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('../apoio/servidor');
const { criarNavegador, salvarCaptura, acoes, ESPERA_MS } = require('../apoio/navegador');

const PASTA = path.join(__dirname, '..', '..', 'resultados', 'nao-funcionais');
const medicoes = {};
after(() => {
  fs.mkdirSync(PASTA, { recursive: true });
  fs.writeFileSync(path.join(PASTA, 'nf-resultados.json'), JSON.stringify({ executadoEm: new Date().toISOString(), node: process.version, plataforma: process.platform, medicoes }, null, 2));
});

function estatisticas(amostras) {
  const ord = [...amostras].sort((a, b) => a - b);
  const media = ord.reduce((s, x) => s + x, 0) / ord.length;
  const p95 = ord[Math.ceil(0.95 * ord.length) - 1];
  return { n: ord.length, media: +media.toFixed(2), p95: +p95.toFixed(2), min: +ord[0].toFixed(2), max: +ord[ord.length - 1].toFixed(2) };
}

async function token(url) {
  const r = await fetch(`${url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'admin', senha: '1234' }) });
  return (await r.json()).token;
}

async function fluxoPrincipal(navegador, largura, altura, nomeCaptura) {
  const srv = await iniciarServidor();
  const driver = await criarNavegador({ navegador, largura, altura });
  try {
    const ui = acoes(driver);
    await driver.get(srv.url);
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000 });
    const texto = await ui.aguardarTexto('result', 'APROVADO');
    const rolagemHorizontal = await driver.executeScript('return document.documentElement.scrollWidth > document.documentElement.clientWidth');
    const versao = (await driver.getCapabilities()).get('browserVersion');
    await salvarCaptura(driver, PASTA, nomeCaptura);
    return { texto, rolagemHorizontal, versao };
  } finally {
    await driver.quit();
    await srv.parar();
  }
}

test('NF-01 [RNF-01 Desempenho] p95 do POST /api/simulacoes < 500 ms (100 requisições)', async () => {
  const srv = await iniciarServidor();
  try {
    const t = await token(srv.url);
    const amostras = [];
    for (let i = 0; i < 100; i += 1) {
      const ini = performance.now();
      const r = await fetch(`${srv.url}/api/simulacoes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ idade: 30, renda: 5000, valor: 1000, conta: 'sim' }),
      });
      await r.text();
      amostras.push(performance.now() - ini);
    }
    medicoes['NF-01'] = { criterio: 'p95 < 500 ms', unidade: 'ms', ...estatisticas(amostras) };
    assert.ok(medicoes['NF-01'].p95 < 500, `p95 = ${medicoes['NF-01'].p95} ms`);
  } finally { await srv.parar(); }
});

test('NF-02 [RNF-01 Desempenho] carregamento da página < 2000 ms (10 medições, Chrome)', async () => {
  const srv = await iniciarServidor();
  const driver = await criarNavegador();
  try {
    const amostras = [];
    for (let i = 0; i < 10; i += 1) {
      await driver.get(`${srv.url}/?r=${i}`);
      await driver.wait(async () => driver.executeScript('return document.readyState === "complete"'), ESPERA_MS);
      amostras.push(await driver.executeScript('const n = performance.getEntriesByType("navigation")[0]; return n.loadEventEnd - n.startTime;'));
    }
    medicoes['NF-02'] = { criterio: 'máximo < 2000 ms', unidade: 'ms', ...estatisticas(amostras) };
    assert.ok(medicoes['NF-02'].max < 2000);
  } finally { await driver.quit(); await srv.parar(); }
});

test('NF-03 [RNF-02 Compatibilidade] fluxo principal no Google Chrome (1366x768)', async () => {
  const r = await fluxoPrincipal('chrome', 1366, 768, 'NF-03_chrome_1366x768');
  medicoes['NF-03'] = { criterio: 'login + simulação aprovada', navegador: `Chrome ${r.versao}`, resultado: r.texto };
  assert.match(r.texto, /APROVADO/);
});

test('NF-04 [RNF-02 Compatibilidade] fluxo principal no Mozilla Firefox (1366x768)', async () => {
  const r = await fluxoPrincipal('firefox', 1366, 768, 'NF-04_firefox_1366x768');
  medicoes['NF-04'] = { criterio: 'login + simulação aprovada', navegador: `Firefox ${r.versao}`, resultado: r.texto };
  assert.match(r.texto, /APROVADO/);
});

test('NF-05 [RNF-02 Compatibilidade] tela de celular 375x667 sem rolagem horizontal', async () => {
  const r = await fluxoPrincipal('chrome', 375, 667, 'NF-05_chrome_375x667');
  medicoes['NF-05'] = { criterio: 'sem rolagem horizontal e fluxo concluído', rolagemHorizontal: r.rolagemHorizontal, resultado: r.texto };
  assert.equal(r.rolagemHorizontal, false);
  assert.match(r.texto, /APROVADO/);
});

test('NF-06 [RNF-03 Segurança] todas as rotas protegidas recusam acesso sem token ou com token inválido', async () => {
  const srv = await iniciarServidor();
  try {
    const rotas = [['GET', '/api/simulacoes'], ['POST', '/api/simulacoes'], ['DELETE', '/api/simulacoes/1'], ['POST', '/api/logout']];
    const obtidos = {};
    for (const [metodo, rota] of rotas) {
      for (const [rotulo, cab] of [['sem token', {}], ['token inválido', { Authorization: 'Bearer abc123' }]]) {
        const r = await fetch(srv.url + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...cab }, body: metodo === 'POST' ? '{}' : undefined });
        obtidos[`${metodo} ${rota} (${rotulo})`] = r.status;
      }
    }
    medicoes['NF-06'] = { criterio: 'todas as respostas = 401', obtidos };
    assert.ok(Object.values(obtidos).every((s) => s === 401));
  } finally { await srv.parar(); }
});

test('NF-07 [RNF-03 Segurança] credenciais não são expostas nos arquivos enviados ao navegador', async () => {
  const srv = await iniciarServidor();
  try {
    const html = await (await fetch(`${srv.url}/`)).text();
    const js = await (await fetch(`${srv.url}/app.js`)).text();
    const expostas = [html, js].some((c) => c.includes('1234'));
    medicoes['NF-07'] = { criterio: 'senha ausente em / e /app.js', senhaEncontrada: expostas };
    assert.equal(expostas, false);
  } finally { await srv.parar(); }
});

test('NF-08 [RNF-03 Segurança] tentativa de acesso a arquivo fora da pasta pública é recusada', async () => {
  const srv = await iniciarServidor();
  try {
    const status = [];
    for (const rota of ['/../package.json', '/%2e%2e/package.json', '/..%2fsrc/auth.js']) {
      status.push((await fetch(srv.url + rota)).status);
    }
    medicoes['NF-08'] = { criterio: 'nenhuma rota retorna 200', status };
    assert.ok(status.every((s) => s !== 200));
  } finally { await srv.parar(); }
});

test('NF-09 [RNF-04 Confiabilidade] 50 simulações persistem íntegras após reinício controlado', async () => {
  const srv = await iniciarServidor();
  const t = await token(srv.url);
  for (let i = 0; i < 50; i += 1) {
    await fetch(`${srv.url}/api/simulacoes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ idade: 20 + (i % 40), renda: 5000, valor: 1000, conta: i % 2 ? 'sim' : 'nao' }),
    });
  }
  await srv.parar();
  const json = JSON.parse(fs.readFileSync(srv.arquivo, 'utf8'));
  const novo = await iniciarServidor(srv.arquivo);
  try {
    const t2 = await token(novo.url);
    const lista = await (await fetch(`${novo.url}/api/simulacoes`, { headers: { Authorization: `Bearer ${t2}` } })).json();
    medicoes['NF-09'] = { criterio: '50 registros após reinício e JSON válido', registrosNoArquivo: json.simulacoes.length, registrosAposReinicio: lista.length };
    assert.equal(lista.length, 50);
  } finally { await novo.parar(); }
});
