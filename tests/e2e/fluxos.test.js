'use strict';
/*
 * Testes de sistema ponta a ponta com Selenium WebDriver (navegador real, servidor real).
 * Em caso de falha, salva captura de tela em resultados/e2e/falhas/.
 */
const path = require('node:path');
const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('../apoio/servidor');
const { criarNavegador, salvarCaptura, acoes, until, ESPERA_MS } = require('../apoio/navegador');

const PASTA_FALHAS = path.join(__dirname, '..', '..', 'resultados', 'e2e', 'falhas');

describe('Fluxos ponta a ponta (Selenium)', () => {
  let srv;
  let driver;
  let ui;

  before(async () => {
    srv = await iniciarServidor();
    driver = await criarNavegador();
    ui = acoes(driver);
  });

  after(async () => {
    if (driver) await driver.quit();
    if (srv) await srv.parar();
  });

  beforeEach(async () => {
    srv.servidor.repositorio.limpar();
    await driver.get(srv.url);
    await driver.executeScript('sessionStorage.clear()');
    await driver.navigate().refresh();
  });

  async function comCaptura(nome, corpo) {
    try {
      await corpo();
    } catch (erro) {
      await salvarCaptura(driver, PASTA_FALHAS, nome);
      throw erro;
    }
  }

  test('E2E-01 [RF-01/RF-06/CT-01] login válido exibe a simulação no estado Autenticado', () => comCaptura('E2E-01', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    assert.equal(await ui.estado(), 'Autenticado');
  }));

  test('E2E-02 [RF-01/CT-02] login inválido mantém tela de login com mensagem de erro', () => comCaptura('E2E-02', async () => {
    await ui.login('admin', 'senhaerrada');
    const msg = await ui.aguardarTexto('loginMsg', 'inválidos');
    assert.equal(msg, 'Login ou senha inválidos.');
    assert.equal(await ui.el('app').isDisplayed(), false);
  }));

  test('E2E-03 [RF-05/RF-06/RF-08/CT-06/CT-29] simulação aprovada aparece no histórico', () => comCaptura('E2E-03', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000, conta: 'sim' });
    await ui.aguardarTexto('result', 'EMPRÉSTIMO APROVADO');
    assert.equal(await ui.estado(), 'Em Simulação');
    await driver.wait(async () => (await ui.linhasHistorico()).length === 1, ESPERA_MS);
    const linha = await (await ui.linhasHistorico())[0].getText();
    assert.match(linha, /APROVADO/);
  }));

  test('E2E-04 [RF-04/RF-05/CT-16] conta inativa resulta em empréstimo negado', () => comCaptura('E2E-04', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000, conta: 'nao' });
    const texto = await ui.aguardarTexto('result', 'EMPRÉSTIMO NEGADO');
    assert.match(texto, /NEGADO/);
  }));

  test('E2E-05 [RF-06/CT-27] não é possível finalizar sem ter simulado', () => comCaptura('E2E-05', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    const botao = ui.el('btnFinalizar');
    if (await botao.isEnabled()) await botao.click();
    assert.equal(await ui.estado(), 'Autenticado');
  }));

  test('E2E-06 [RF-06/CT-26/CT-28] após finalizar, nova simulação fica bloqueada até reiniciar', () => comCaptura('E2E-06', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000 });
    await ui.aguardarTexto('result', 'APROVADO');
    await ui.el('btnFinalizar').click();
    assert.equal(await ui.estado(), 'Finalizado');
    assert.equal(await ui.el('btnSimular').isEnabled(), false);
  }));

  test('E2E-07 [RF-09/CT-31] excluir simulação remove a linha do histórico', () => comCaptura('E2E-07', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000 });
    await driver.wait(async () => (await ui.linhasHistorico()).length === 1, ESPERA_MS);
    const [linha] = await ui.linhasHistorico();
    await linha.findElement({ css: '.btnExcluir' }).click();
    await driver.wait(async () => (await ui.linhasHistorico()).length === 0, ESPERA_MS);
    assert.equal(await ui.el('historicoVazio').isDisplayed(), true);
  }));

  test('E2E-08 [RF-10/CT-32] sair encerra a sessão e volta para o login', () => comCaptura('E2E-08', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.el('btnSair').click();
    await driver.wait(until.elementIsVisible(ui.el('login')), ESPERA_MS);
    assert.equal(await ui.estado(), 'Não autenticado');
    const token = await driver.executeScript('return sessionStorage.getItem("token")');
    assert.equal(token, null);
  }));

  test('E2E-09 [RF-11] empréstimo negado exibe o motivo na tela', () => comCaptura('E2E-09', async () => {
    await ui.login('admin', '1234');
    await ui.visivel('app');
    await ui.simular({ idade: 30, renda: 5000, valor: 1000, conta: 'nao' });
    const texto = await ui.aguardarTexto('result', 'NEGADO');
    assert.match(texto, /Conta inativa\./);
  }));
});
