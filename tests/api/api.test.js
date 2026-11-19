'use strict';
/*
 * Testes de integração da API REST (interface HTTP + regras + persistência em arquivo).
 * Cada teste sobe o servidor real em porta livre, com arquivo de dados temporário.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { iniciarServidor } = require('../apoio/servidor');

let srv;
before(async () => { srv = await iniciarServidor(); });
after(async () => { await srv.parar(); });

async function chamar(metodo, caminho, { corpo, token } = {}) {
  const resp = await fetch(srv.url + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  return { status: resp.status, corpo: texto ? JSON.parse(texto) : null };
}

async function logar() {
  const r = await chamar('POST', '/api/login', { corpo: { usuario: 'admin', senha: '1234' } });
  return r.corpo.token;
}

const valida = { idade: 30, renda: 5000, valor: 1000, conta: 'sim' };

test('IT-01 [RF-01] login com credenciais válidas retorna 200 e token', async () => {
  const r = await chamar('POST', '/api/login', { corpo: { usuario: 'admin', senha: '1234' } });
  assert.equal(r.status, 200);
  assert.match(r.corpo.token, /^[0-9a-f]{48}$/);
});

test('IT-02 [RF-01] login com senha inválida retorna 401 e mensagem de erro', async () => {
  const r = await chamar('POST', '/api/login', { corpo: { usuario: 'admin', senha: 'errada' } });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.erro, 'Login ou senha inválidos.');
  assert.equal(r.corpo.token, undefined);
});

test('IT-03 [RNF-03] criar simulação sem token retorna 401', async () => {
  const r = await chamar('POST', '/api/simulacoes', { corpo: valida });
  assert.equal(r.status, 401);
});

test('IT-04 [RF-05/RF-08] simulação válida retorna 201, APROVADO e fica persistida', async () => {
  const token = await logar();
  const r = await chamar('POST', '/api/simulacoes', { corpo: valida, token });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.resultado, 'APROVADO');
  assert.equal(typeof r.corpo.id, 'number');
  const lista = await chamar('GET', '/api/simulacoes', { token });
  assert.ok(lista.corpo.some((s) => s.id === r.corpo.id));
});

test('IT-05 [RF-04/RF-05] conta inativa retorna 201 com NEGADO', async () => {
  const token = await logar();
  const r = await chamar('POST', '/api/simulacoes', { corpo: { ...valida, conta: 'nao' }, token });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.resultado, 'NEGADO');
});

test('IT-06 [RF-07] dados inválidos retornam 400 e não são persistidos', async () => {
  const token = await logar();
  const antes = (await chamar('GET', '/api/simulacoes', { token })).corpo.length;
  const r = await chamar('POST', '/api/simulacoes', { corpo: { ...valida, valor: -5 }, token });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.erro, 'Dados inválidos.');
  const depois = (await chamar('GET', '/api/simulacoes', { token })).corpo.length;
  assert.equal(depois, antes);
});

test('IT-07 [RF-09] excluir simulação existente retorna 204 e remove do histórico', async () => {
  const token = await logar();
  const criada = await chamar('POST', '/api/simulacoes', { corpo: valida, token });
  const r = await chamar('DELETE', `/api/simulacoes/${criada.corpo.id}`, { token });
  assert.equal(r.status, 204);
  const lista = await chamar('GET', '/api/simulacoes', { token });
  assert.ok(!lista.corpo.some((s) => s.id === criada.corpo.id));
});

test('IT-08 [RF-09] excluir simulação inexistente retorna 404', async () => {
  const token = await logar();
  const r = await chamar('DELETE', '/api/simulacoes/999999', { token });
  assert.equal(r.status, 404);
});

test('IT-09 [RF-10] após logout o token deixa de ser aceito', async () => {
  const token = await logar();
  assert.equal((await chamar('POST', '/api/logout', { token })).status, 204);
  assert.equal((await chamar('GET', '/api/simulacoes', { token })).status, 401);
});

test('IT-10 [RNF-04] dados persistem após reinício do servidor', async () => {
  const token = await logar();
  const criada = await chamar('POST', '/api/simulacoes', { corpo: valida, token });
  const outro = await iniciarServidor(srv.arquivo);
  try {
    const login = await fetch(`${outro.url}/api/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'admin', senha: '1234' }),
    }).then((x) => x.json());
    const lista = await fetch(`${outro.url}/api/simulacoes`, { headers: { Authorization: `Bearer ${login.token}` } }).then((x) => x.json());
    assert.ok(lista.some((s) => s.id === criada.corpo.id));
  } finally {
    await outro.parar();
  }
});

test('IT-11 [RF-07] JSON malformado retorna 400', async () => {
  const token = await logar();
  const resp = await fetch(`${srv.url}/api/simulacoes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{idade:',
  });
  assert.equal(resp.status, 400);
});
