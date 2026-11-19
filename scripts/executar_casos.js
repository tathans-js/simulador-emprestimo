'use strict';
/*
 * Executor assistido dos casos manuais (tests/manuais/casos.js).
 * Segue os passos de cada caso no navegador (Selenium), compara esperado x obtido,
 * carimba a tela com caso/ciclo/versão/data e salva a captura como evidência.
 *
 * Uso:
 *   node scripts/executar_casos.js --alvo v2 --ciclo C1          (servidor v2 iniciado automaticamente)
 *   node scripts/executar_casos.js --alvo v1 --ciclo C0          (arquivo v1.0/index.html)
 *   node scripts/executar_casos.js --exportar                    (gera resultados/catalogo/casos.json)
 */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { casos } = require('../tests/manuais/casos');
const { criarServidor } = require('../src/servidor');
const { criarNavegador, By, until } = require('../tests/apoio/navegador');

const RAIZ = path.join(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true] : null)).filter(Boolean));

function exportarCatalogo() {
  const destino = path.join(RAIZ, 'resultados', 'catalogo');
  fs.mkdirSync(destino, { recursive: true });
  const dados = casos.map(({ executar, ...c }) => ({ ...c, esperado: Object.entries(c.esperado).map(([k, v]) => `${k}: ${v}`).join('; ') }));
  fs.writeFileSync(path.join(destino, 'casos.json'), JSON.stringify(dados, null, 2));
  console.log(`Catálogo exportado: ${dados.length} casos`);
}

function versaoAtual(alvo) {
  if (alvo === 'v1') return '1.0 (v1.0/index.html)';
  const pkg = require('../package.json');
  let commit = 'sem-git';
  try { commit = execSync('git rev-parse --short HEAD', { cwd: RAIZ }).toString().trim(); } catch { /* sem git */ }
  return `${pkg.version} (commit ${commit})`;
}

async function main() {
  if (args.exportar) return exportarCatalogo();
  const alvo = args.alvo || 'v2';
  const ciclo = args.ciclo || 'C1';
  const versao = versaoAtual(alvo);
  const pasta = path.join(RAIZ, 'resultados', 'execucoes', ciclo);
  fs.mkdirSync(pasta, { recursive: true });

  let servidor = null;
  let porta = 0;
  const arquivoDados = path.join(pasta, 'dados-execucao.json');
  async function subir() {
    servidor = criarServidor({ arquivoDados });
    await new Promise((r) => servidor.listen(porta, '127.0.0.1', r));
    porta = servidor.address().port;
  }
  async function parar() {
    if (!servidor) return;
    servidor.closeAllConnections();
    await new Promise((r) => servidor.close(r));
  }
  if (alvo === 'v2') await subir();
  const url = alvo === 'v2' ? () => `http://127.0.0.1:${porta}/` : () => `file://${path.join(RAIZ, 'v1.0', 'index.html')}`;
  const sel = alvo === 'v2'
    ? { entrar: '#btnEntrar', simular: '#btnSimular', finalizar: '#btnFinalizar' }
    : { entrar: 'button[onclick="login()"]', simular: 'button[onclick="simulate()"]', finalizar: 'button[onclick="finish()"]' };

  const driver = await criarNavegador({ largura: 1280, altura: 1000 });
  const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = (id) => driver.findElement(By.id(id));
  const h = {
    pausa,
    async abrir() {
      await driver.get(url());
      if (alvo === 'v2') { await driver.executeScript('sessionStorage.clear()'); await driver.navigate().refresh(); }
    },
    async login(u, s) {
      await el('user').clear(); if (u) await el('user').sendKeys(u);
      await el('pass').clear(); if (s) await el('pass').sendKeys(s);
      await driver.findElement(By.css(sel.entrar)).click();
      await driver.wait(async () => (await el('app').isDisplayed()) || (await el('loginMsg').getText()) !== '', 3000).catch(() => {});
    },
    async simular(d) {
      for (const [id, v] of [['age', d.idade], ['income', d.renda], ['amount', d.valor]]) {
        await el(id).clear(); if (v !== '' && v !== undefined) await el(id).sendKeys(String(v));
      }
      await el('active').findElement(By.css(`option[value="${d.conta || 'sim'}"]`)).click();
      const botao = driver.findElement(By.css(sel.simular));
      if (await botao.isEnabled()) await botao.click();
      await pausa(400);
    },
    async finalizar() {
      const botao = driver.findElement(By.css(sel.finalizar));
      if (await botao.isEnabled()) await botao.click();
      await pausa(200);
    },
    async resultado() {
      const r = el('result');
      if (!(await r.isDisplayed())) return '(sem mensagem)';
      return (await r.getText()).split('\n')[0].trim();
    },
    estado: () => el('state').getAttribute('textContent'),
    msgLogin: () => el('loginMsg').getText(),
    async visivel(id) { return (await el(id).isDisplayed()) ? 'visível' : 'oculta'; },
    appVisivel() { return h.visivel('app'); },
    texto: (id) => el(id).getText(),
    textoBruto: (id) => el(id).getAttribute('textContent'),
    async historico() { return Promise.all((await driver.findElements(By.css('#historico tr'))).map((tr) => tr.getText())); },
    async aguardarLinhas(n) { await driver.wait(async () => (await driver.findElements(By.css('#historico tr'))).length === n, 3000).catch(() => {}); },
    async excluirPrimeira() { await driver.findElement(By.css('#historico tr .btnExcluir')).click(); },
    async sair() { await el('btnSair').click(); await driver.wait(until.elementIsVisible(el('login')), 3000).catch(() => {}); },
    async recarregar() { await driver.navigate().refresh(); await pausa(400); },
    async reiniciarServidor() { await parar(); await subir(); },
    async itensMotivos() { return driver.findElements(By.css('#result li')); },
    async forcarTelaSemLogin() { await driver.executeScript('document.getElementById("app").classList.remove("hidden")'); },
  };

  const registros = [];
  let seq = 0;
  for (const caso of casos) {
    seq += 1;
    const exec = `EX-${ciclo}-${String(seq).padStart(2, '0')}`;
    const data = new Date();
    const dataTxt = data.toLocaleString('pt-BR');
    const reg = { execucao: exec, caso: caso.id, titulo: caso.titulo, ciclo, versao, dataHora: dataTxt, esperado: caso.esperado, obtido: null, resultado: null, evidencia: null, observacao: '' };
    if (alvo === 'v1' && caso.somenteV2) {
      Object.assign(reg, { obtido: {}, resultado: 'Não executado', observacao: 'Funcionalidade inexistente na versão 1.0.' });
      registros.push(reg);
      console.log(`${exec} ${caso.id} Não executado`);
      continue;
    }
    try {
      if (servidor) servidor.repositorio.limpar();
      await h.abrir();
      const obtido = await caso.executar(h);
      const confere = Object.entries(caso.esperado).every(([k, v]) => obtido[k] === v);
      Object.assign(reg, { obtido, resultado: confere ? 'Aprovado' : 'Reprovado' });
    } catch (erro) {
      Object.assign(reg, { obtido: {}, resultado: 'Bloqueado', observacao: erro.message.split('\n')[0] });
    }
    try {
      await driver.executeScript(`const d=document.createElement('div');d.textContent=arguments[0];d.style.cssText='position:fixed;right:8px;bottom:8px;background:#ffeb3b;color:#000;font:bold 13px Arial;padding:6px 10px;border:2px solid #000;z-index:9999';document.body.appendChild(d);`,
        `${caso.id} | ${exec} | v${versao} | ${dataTxt} | ${reg.resultado}`);
      const arquivo = path.join(pasta, `${caso.id}.png`);
      fs.writeFileSync(arquivo, await driver.takeScreenshot(), 'base64');
      reg.evidencia = path.relative(RAIZ, arquivo);
    } catch { /* sem captura */ }
    registros.push(reg);
    console.log(`${exec} ${caso.id} ${reg.resultado}${reg.resultado === 'Aprovado' ? '' : ` -> obtido ${JSON.stringify(reg.obtido)}`}`);
  }

  await driver.quit();
  await parar();
  fs.rmSync(arquivoDados, { force: true });
  fs.writeFileSync(path.join(pasta, 'execucoes.json'), JSON.stringify(registros, null, 2));
  const fmt = (o) => Object.entries(o || {}).map(([k, v]) => `${k}: ${v}`).join('; ');
  const csv = ['Execução;Caso;Ciclo;Versão;Data/hora;Esperado;Obtido;Resultado;Evidência;Observação',
    ...registros.map((r) => [r.execucao, r.caso, r.ciclo, r.versao, r.dataHora, fmt(r.esperado), fmt(r.obtido), r.resultado, r.evidencia || '', r.observacao].map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';'))];
  fs.writeFileSync(path.join(pasta, 'execucoes.csv'), `﻿${csv.join('\n')}\n`);
  const cont = registros.reduce((a, r) => ({ ...a, [r.resultado]: (a[r.resultado] || 0) + 1 }), {});
  console.log(`Resumo ${ciclo}:`, cont);
}

main().catch((e) => { console.error(e); process.exit(1); });
