'use strict';
/* Cliente do Simulador de Empréstimo: interface que consome a API REST (/api). */

const $ = (id) => document.getElementById(id);
const moeda = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
let token = sessionStorage.getItem('token');

let estadoAtual = 'Não autenticado';

/* Máquina de estados (RF-06): Não autenticado → Autenticado → Em Simulação → Finalizado. */
function setState(s) {
  estadoAtual = s;
  $('state').textContent = s;
  $('btnSimular').disabled = s === 'Finalizado';
  $('btnFinalizar').disabled = s !== 'Em Simulação';
  $('btnNova').classList.toggle('hidden', s !== 'Finalizado');
}

async function chamarApi(metodo, caminho, corpo) {
  const resp = await fetch(caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resp.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (resp.status === 401 && caminho !== '/api/login') {
    encerrarSessaoLocal();
    $('loginMsg').innerHTML = '<span class="bad">Sessão inválida ou expirada. Faça login novamente.</span>';
  }
  return { status: resp.status, dados };
}

function mostrarApp() {
  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');
  setState('Autenticado');
  carregarHistorico();
}

function encerrarSessaoLocal() {
  token = null;
  sessionStorage.removeItem('token');
  $('app').classList.add('hidden');
  $('login').classList.remove('hidden');
  $('result').classList.add('hidden');
  setState('Não autenticado');
}

async function login(evento) {
  evento.preventDefault();
  const r = await chamarApi('POST', '/api/login', { usuario: $('user').value, senha: $('pass').value });
  if (r.status === 200) {
    token = r.dados.token;
    sessionStorage.setItem('token', token);
    $('loginMsg').textContent = '';
    $('pass').value = '';
    mostrarApp();
  } else {
    $('loginMsg').innerHTML = '<span class="bad">Login ou senha inválidos.</span>';
  }
}

async function simulate(evento) {
  evento.preventDefault();
  if (estadoAtual === 'Finalizado') return;
  const result = $('result');
  const r = await chamarApi('POST', '/api/simulacoes', {
    idade: $('age').value,
    renda: $('income').value,
    valor: $('amount').value,
    conta: $('active').value,
  });
  if (r.status === 401) return;
  result.classList.remove('hidden');
  if (r.status === 400) {
    result.innerHTML = '<span class="bad">Dados inválidos.</span>';
    return;
  }
  setState('Em Simulação');
  if (r.dados.resultado === 'APROVADO') {
    result.innerHTML = '<span class="ok">EMPRÉSTIMO APROVADO</span><br>Proposta gerada com sucesso.';
  } else {
    result.innerHTML = '<span class="bad">EMPRÉSTIMO NEGADO</span><br>Requisitos não atendidos:';
    const lista = document.createElement('ul');
    r.dados.motivos.forEach((m) => {
      const li = document.createElement('li');
      li.textContent = m;
      lista.appendChild(li);
    });
    result.appendChild(lista);
  }
  carregarHistorico();
}

function finish() {
  if (estadoAtual !== 'Em Simulação') return;
  setState('Finalizado');
  $('result').classList.remove('hidden');
  $('result').innerHTML = '<strong>Simulação finalizada.</strong>';
}

function novaSimulacao() {
  $('formSimulacao').reset();
  $('result').classList.add('hidden');
  setState('Autenticado');
}

async function sair() {
  await chamarApi('POST', '/api/logout');
  encerrarSessaoLocal();
}

async function carregarHistorico() {
  const r = await chamarApi('GET', '/api/simulacoes');
  if (r.status !== 200) return;
  const corpo = $('historico');
  corpo.innerHTML = '';
  r.dados.forEach((s) => {
    const tr = document.createElement('tr');
    tr.dataset.id = s.id;
    const celulas = [s.id, s.idade, moeda(s.renda), moeda(s.valor), s.conta === 'sim' ? 'Ativa' : 'Inativa', s.resultado];
    celulas.forEach((c) => {
      const td = document.createElement('td');
      td.textContent = c;
      tr.appendChild(td);
    });
    const tdAcao = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Excluir';
    btn.className = 'btnExcluir';
    btn.addEventListener('click', () => excluir(s.id));
    tdAcao.appendChild(btn);
    tr.appendChild(tdAcao);
    corpo.appendChild(tr);
  });
  $('historicoVazio').classList.toggle('hidden', r.dados.length > 0);
}

async function excluir(id) {
  const r = await chamarApi('DELETE', `/api/simulacoes/${id}`);
  if (r.status === 204) carregarHistorico();
}

$('formLogin').addEventListener('submit', login);
$('formSimulacao').addEventListener('submit', simulate);
$('btnFinalizar').addEventListener('click', finish);
$('btnSair').addEventListener('click', sair);
$('btnNova').addEventListener('click', novaSimulacao);

if (token) mostrarApp();
