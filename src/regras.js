'use strict';
/**
 * Regras de negócio do Simulador de Empréstimo.
 *  RF-02 idade entre IDADE_MINIMA e IDADE_MAXIMA (inclusivo)
 *  RF-03 renda mensal >= FATOR_RENDA x valor solicitado
 *  RF-04 conta ativa
 *  RF-05 aprovado somente quando todas as regras são atendidas
 *  RF-07 idade, renda e valor obrigatórios, numéricos, não negativos e valor > 0
 *  RF-11 negação informa os motivos, na ordem das regras
 */

const IDADE_MINIMA = 18;
const IDADE_MAXIMA = 60;
const FATOR_RENDA = 5;
const CAMPOS_NUMERICOS = ['idade', 'renda', 'valor'];

function campoVazio(valor) {
  return valor === undefined || valor === null || String(valor).trim() === '';
}

function validarEntrada(dados) {
  if (CAMPOS_NUMERICOS.some((campo) => campoVazio(dados[campo]))) {
    return { valido: false };
  }
  const [idade, renda, valor] = CAMPOS_NUMERICOS.map((campo) => Number(dados[campo]));
  const numericos = [idade, renda, valor].every(Number.isFinite);
  if (!numericos || idade < 0 || renda < 0 || valor <= 0) {
    return { valido: false };
  }
  return { valido: true, idade, renda, valor };
}

function idadeValida(idade) {
  return idade >= IDADE_MINIMA && idade <= IDADE_MAXIMA;
}

function rendaSuficiente(renda, valor) {
  return renda >= valor * FATOR_RENDA;
}

function contaAtiva(conta) {
  return conta === 'sim';
}

const REGRAS = [
  { atendida: (e) => idadeValida(e.idade), motivo: `Idade fora da faixa permitida (${IDADE_MINIMA} a ${IDADE_MAXIMA} anos).` },
  { atendida: (e) => rendaSuficiente(e.renda, e.valor), motivo: `Renda mensal inferior a ${FATOR_RENDA} vezes o valor solicitado.` },
  { atendida: (e) => contaAtiva(e.conta), motivo: 'Conta inativa.' },
];

function avaliarEmprestimo(dados) {
  const entrada = validarEntrada(dados);
  if (!entrada.valido) {
    return { resultado: 'DADOS_INVALIDOS' };
  }
  const contexto = { ...entrada, conta: dados.conta };
  const motivos = REGRAS.filter((regra) => !regra.atendida(contexto)).map((regra) => regra.motivo);
  return { resultado: motivos.length === 0 ? 'APROVADO' : 'NEGADO', motivos };
}

module.exports = {
  validarEntrada, idadeValida, rendaSuficiente, contaAtiva, avaliarEmprestimo,
  IDADE_MINIMA, IDADE_MAXIMA, FATOR_RENDA,
};
