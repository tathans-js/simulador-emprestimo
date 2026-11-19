'use strict';
/**
 * Regras de negócio do Simulador de Empréstimo.
 * Portadas da versão 1.0 (v1.0/index.html, função simulate) sem alteração de comportamento.
 */

function campoVazio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function validarEntrada(dados) {
  if (['idade', 'renda', 'valor'].some((campo) => campoVazio(dados[campo]))) {
    return { valido: false };
  }
  const idade = Number(dados.idade);
  const renda = Number(dados.renda);
  const valor = Number(dados.valor);
  if (!Number.isFinite(idade) || !Number.isFinite(renda) || !Number.isFinite(valor) ||
      idade < 0 || renda < 0 || valor <= 0) {
    return { valido: false };
  }
  return { valido: true, idade, renda, valor };
}

function idadeValida(idade) {
  return idade >= 18 && idade <= 60;
}

function rendaSuficiente(renda, valor) {
  return renda >= valor * 5;
}

function contaAtiva(conta) {
  return conta === 'sim';
}

function avaliarEmprestimo(dados) {
  const entrada = validarEntrada(dados);
  if (!entrada.valido) {
    return { resultado: 'DADOS_INVALIDOS' };
  }
  const motivos = [];
  if (!idadeValida(entrada.idade)) motivos.push('Idade fora da faixa permitida (18 a 60 anos).');
  if (!rendaSuficiente(entrada.renda, entrada.valor)) motivos.push('Renda mensal inferior a 5 vezes o valor solicitado.');
  if (!contaAtiva(dados.conta)) motivos.push('Conta inativa.');
  return { resultado: motivos.length === 0 ? 'APROVADO' : 'NEGADO', motivos };
}

module.exports = { validarEntrada, idadeValida, rendaSuficiente, contaAtiva, avaliarEmprestimo };
