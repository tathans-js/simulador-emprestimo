'use strict';
/*
 * Testes unitários das regras de negócio (src/regras.js).
 * Cada teste indica o requisito (RF) e o caso manual (CT) que representa.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validarEntrada, idadeValida, rendaSuficiente, contaAtiva, avaliarEmprestimo } = require('../../src/regras');

const base = { idade: 30, renda: 5000, valor: 1000, conta: 'sim' };

test('UT-01 [RF-02/CT-06] idade 30 (partição válida) é aceita', () => {
  assert.equal(idadeValida(30), true);
});

test('UT-02 [RF-02/CT-07] idade 17 (abaixo do limite) é rejeitada', () => {
  assert.equal(idadeValida(17), false);
});

test('UT-03 [RF-02/CT-08] idade 18 (limite inferior inclusivo) é aceita', () => {
  assert.equal(idadeValida(18), true);
});

test('UT-04 [RF-02/CT-09] idade 60 (limite superior inclusivo) é aceita', () => {
  assert.equal(idadeValida(60), true);
});

test('UT-05 [RF-02/CT-10] idade 61 (acima do limite) é rejeitada', () => {
  assert.equal(idadeValida(61), false);
});

test('UT-06 [RF-03/CT-13] renda exatamente 5x o valor é suficiente', () => {
  assert.equal(rendaSuficiente(5000, 1000), true);
});

test('UT-07 [RF-03/CT-14] renda 1 centavo abaixo de 5x é insuficiente', () => {
  assert.equal(rendaSuficiente(4999.99, 1000), false);
});

test('UT-08 [RF-04/CT-16] conta "nao" é considerada inativa', () => {
  assert.equal(contaAtiva('nao'), false);
  assert.equal(contaAtiva('sim'), true);
});

test('UT-09 [RF-05/CT-06] todas as condições atendidas resultam em APROVADO', () => {
  assert.equal(avaliarEmprestimo(base).resultado, 'APROVADO');
});

test('UT-10 [RF-05/CT-17] nenhuma condição atendida resulta em NEGADO', () => {
  assert.equal(avaliarEmprestimo({ idade: 17, renda: 100, valor: 1000, conta: 'nao' }).resultado, 'NEGADO');
});

test('UT-11 [RF-07/CT-19] valor solicitado zero é dado inválido', () => {
  assert.equal(validarEntrada({ ...base, valor: 0 }).valido, false);
});

test('UT-12 [RF-07/CT-20] valor solicitado negativo é dado inválido', () => {
  assert.equal(validarEntrada({ ...base, valor: -100 }).valido, false);
});

test('UT-13 [RF-07/CT-21] idade em branco é dado inválido (não pode virar zero)', () => {
  assert.equal(validarEntrada({ ...base, idade: '' }).valido, false);
});

test('UT-14 [RF-07/CT-22] renda em branco é dado inválido (não pode virar zero)', () => {
  assert.equal(validarEntrada({ ...base, renda: '' }).valido, false);
});

test('UT-15 [RF-07] campo ausente (null) é dado inválido', () => {
  assert.equal(validarEntrada({ ...base, idade: null }).valido, false);
});

// ---- TDD RF-11: o sistema deve informar os motivos da negação ----

test('UT-16 [RF-11] negação por conta inativa informa o motivo "Conta inativa."', () => {
  assert.deepEqual(avaliarEmprestimo({ ...base, conta: 'nao' }).motivos, ['Conta inativa.']);
});

test('UT-17 [RF-11] negação com todas as condições falsas informa os três motivos na ordem das regras', () => {
  assert.deepEqual(avaliarEmprestimo({ idade: 17, renda: 100, valor: 1000, conta: 'nao' }).motivos, [
    'Idade fora da faixa permitida (18 a 60 anos).',
    'Renda mensal inferior a 5 vezes o valor solicitado.',
    'Conta inativa.',
  ]);
});

test('UT-18 [RF-11] aprovação não possui motivos de negação', () => {
  assert.deepEqual(avaliarEmprestimo(base).motivos, []);
});
