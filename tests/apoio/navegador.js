'use strict';
/* Fábrica de WebDriver (Selenium) e ações reutilizáveis da interface. */
const fs = require('node:fs');
const path = require('node:path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const firefox = require('selenium-webdriver/firefox');

const ESPERA_MS = 5000;

async function criarNavegador({ navegador = process.env.BROWSER || 'chrome', largura = 1366, altura = 768 } = {}) {
  const builder = new Builder().forBrowser(navegador);
  if (navegador === 'chrome') {
    builder.setChromeOptions(new chrome.Options().addArguments('--headless=new', '--no-sandbox', `--window-size=${largura},${altura}`));
  } else {
    builder.setFirefoxOptions(new firefox.Options().addArguments('-headless', `--width=${largura}`, `--height=${altura}`));
  }
  const driver = await builder.build();
  return driver;
}

async function salvarCaptura(driver, pasta, nome) {
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, `${nome}.png`);
  fs.writeFileSync(arquivo, await driver.takeScreenshot(), 'base64');
  return arquivo;
}

function acoes(driver) {
  const el = (id) => driver.findElement(By.id(id));
  const visivel = async (id) => driver.wait(until.elementIsVisible(el(id)), ESPERA_MS);
  return {
    el,
    visivel,
    async login(usuario, senha) {
      await (await el('user')).clear();
      await el('user').sendKeys(usuario);
      await el('pass').sendKeys(senha);
      await el('btnEntrar').click();
    },
    async simular({ idade = '', renda = '', valor = '', conta = 'sim' }) {
      for (const [id, v] of [['age', idade], ['income', renda], ['amount', valor]]) {
        await el(id).clear();
        if (v !== '') await el(id).sendKeys(String(v));
      }
      await el('active').findElement(By.css(`option[value="${conta}"]`)).click();
      await el('btnSimular').click();
    },
    async aguardarTexto(id, trecho) {
      await driver.wait(until.elementTextContains(el(id), trecho), ESPERA_MS);
      return el(id).getText();
    },
    async estado() {
      return el('state').getAttribute('textContent');
    },
    async linhasHistorico() {
      return driver.findElements(By.css('#historico tr'));
    },
  };
}

module.exports = { criarNavegador, salvarCaptura, acoes, By, until, ESPERA_MS };
