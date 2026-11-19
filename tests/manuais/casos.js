'use strict';
/*
 * Catálogo de casos de teste manuais (fonte única).
 * - Gera a planilha do catálogo (docs/ferramentas/gerar_planilhas.py lê casos.json exportado).
 * - É usado pelo executor assistido (scripts/executar_casos.js), que segue os mesmos passos
 *   no navegador, compara esperado x obtido e salva a captura de tela como evidência.
 */

const ok = { idade: 30, renda: 5000, valor: 1000, conta: 'sim' };
const APROV = 'EMPRÉSTIMO APROVADO';
const NEG = 'EMPRÉSTIMO NEGADO';
const INV = 'Dados inválidos.';
const LOGIN_ERR = 'Login ou senha inválidos.';

function simulacao(id, titulo, req, risco, tecnica, tipo, prioridade, dados, esperadoResultado, extra = {}) {
  const linhas = [`Idade=${dados.idade === '' ? '(vazio)' : dados.idade}`, `Renda=${dados.renda === '' ? '(vazio)' : dados.renda}`,
    `Valor=${dados.valor === '' ? '(vazio)' : dados.valor}`, `Conta ativa=${dados.conta === 'sim' ? 'Sim' : 'Não'}`];
  return {
    id, titulo, requisitos: req, riscos: risco, nivel: 'Sistema (interface)', tecnica, tipo, prioridade,
    preCondicoes: 'Sistema em execução; usuário autenticado (admin/1234); estado Autenticado.',
    dados: linhas.join('; '),
    passos: ['Fazer login com admin / 1234.', `Preencher: ${linhas.join(', ')}.`, 'Clicar em "Simular empréstimo".', 'Observar a mensagem de resultado.'],
    esperado: { resultado: esperadoResultado },
    automacao: extra.automacao || 'Sim – regra coberta por teste unitário e de API',
    async executar(h) {
      await h.login('admin', '1234');
      await h.simular(dados);
      return { resultado: await h.resultado() };
    },
    ...extra.sobrescrever,
  };
}

const casos = [
  {
    id: 'CT-01', titulo: 'Login com credenciais válidas', requisitos: 'RF-01; RF-06', riscos: 'R-01', nivel: 'Sistema (interface)',
    tecnica: 'Partição de equivalência (classe válida)', tipo: 'Positivo', prioridade: 'Alta',
    preCondicoes: 'Tela de login aberta.', dados: 'Usuário=admin; Senha=1234',
    passos: ['Informar usuário "admin".', 'Informar senha "1234".', 'Clicar em "Entrar".'],
    esperado: { telaSimulacao: 'visível', estado: 'Autenticado' },
    automacao: 'Sim – E2E-01, IT-01, PM-03',
    async executar(h) { await h.login('admin', '1234'); return { telaSimulacao: await h.appVisivel(), estado: await h.estado() }; },
  },
  {
    id: 'CT-02', titulo: 'Login com senha incorreta', requisitos: 'RF-01', riscos: 'R-01', nivel: 'Sistema (interface)',
    tecnica: 'Partição de equivalência (classe inválida)', tipo: 'Negativo', prioridade: 'Alta',
    preCondicoes: 'Tela de login aberta.', dados: 'Usuário=admin; Senha=senhaerrada',
    passos: ['Informar usuário "admin".', 'Informar senha "senhaerrada".', 'Clicar em "Entrar".'],
    esperado: { mensagem: LOGIN_ERR, telaSimulacao: 'oculta' },
    automacao: 'Sim – E2E-02, IT-02, PM-02',
    async executar(h) { await h.login('admin', 'senhaerrada'); return { mensagem: await h.msgLogin(), telaSimulacao: await h.appVisivel() }; },
  },
  {
    id: 'CT-03', titulo: 'Login com usuário inexistente', requisitos: 'RF-01', riscos: 'R-01', nivel: 'Sistema (interface)',
    tecnica: 'Partição de equivalência (classe inválida)', tipo: 'Negativo', prioridade: 'Média',
    preCondicoes: 'Tela de login aberta.', dados: 'Usuário=joao; Senha=1234',
    passos: ['Informar usuário "joao".', 'Informar senha "1234".', 'Clicar em "Entrar".'],
    esperado: { mensagem: LOGIN_ERR, telaSimulacao: 'oculta' },
    automacao: 'Não – mesma partição de CT-02, já automatizada',
    async executar(h) { await h.login('joao', '1234'); return { mensagem: await h.msgLogin(), telaSimulacao: await h.appVisivel() }; },
  },
  {
    id: 'CT-04', titulo: 'Login com campos vazios', requisitos: 'RF-01', riscos: 'R-01', nivel: 'Sistema (interface)',
    tecnica: 'Teste de exceção', tipo: 'Exceção', prioridade: 'Média',
    preCondicoes: 'Tela de login aberta.', dados: 'Usuário=(vazio); Senha=(vazio)',
    passos: ['Deixar usuário e senha em branco.', 'Clicar em "Entrar".'],
    esperado: { mensagem: LOGIN_ERR, telaSimulacao: 'oculta' },
    automacao: 'Não – baixo risco, verificação rápida manual',
    async executar(h) { await h.login('', ''); return { mensagem: await h.msgLogin(), telaSimulacao: await h.appVisivel() }; },
  },
  {
    id: 'CT-05', titulo: 'Login sensível a maiúsculas (Admin)', requisitos: 'RF-01; RNF-03', riscos: 'R-01', nivel: 'Sistema (interface)',
    tecnica: 'Valor limite (variação mínima do dado válido)', tipo: 'Limite', prioridade: 'Baixa',
    preCondicoes: 'Tela de login aberta.', dados: 'Usuário=Admin; Senha=1234',
    passos: ['Informar usuário "Admin".', 'Informar senha "1234".', 'Clicar em "Entrar".'],
    esperado: { mensagem: LOGIN_ERR, telaSimulacao: 'oculta' },
    automacao: 'Não – baixo risco',
    async executar(h) { await h.login('Admin', '1234'); return { mensagem: await h.msgLogin(), telaSimulacao: await h.appVisivel() }; },
  },
  simulacao('CT-06', 'Idade 30 – partição válida', 'RF-02; RF-05', 'R-02; R-05', 'Partição de equivalência (classe válida)', 'Positivo', 'Alta', ok, APROV, { automacao: 'Sim – UT-01, UT-09, E2E-03, PM-05' }),
  simulacao('CT-07', 'Idade 17 – abaixo do limite inferior', 'RF-02', 'R-02', 'Valor limite (17)', 'Limite', 'Alta', { ...ok, idade: 17 }, NEG, { automacao: 'Sim – UT-02' }),
  simulacao('CT-08', 'Idade 18 – limite inferior inclusivo', 'RF-02', 'R-02', 'Valor limite (18)', 'Limite', 'Alta', { ...ok, idade: 18 }, APROV, { automacao: 'Sim – UT-03' }),
  simulacao('CT-09', 'Idade 60 – limite superior inclusivo', 'RF-02', 'R-02', 'Valor limite (60)', 'Limite', 'Alta', { ...ok, idade: 60 }, APROV, { automacao: 'Sim – UT-04' }),
  simulacao('CT-10', 'Idade 61 – acima do limite superior', 'RF-02', 'R-02', 'Valor limite (61)', 'Limite', 'Alta', { ...ok, idade: 61 }, NEG, { automacao: 'Sim – UT-05' }),
  simulacao('CT-11', 'Idade 19 – logo acima do limite inferior', 'RF-02', 'R-02', 'Valor limite (3 valores: 19)', 'Limite', 'Média', { ...ok, idade: 19 }, APROV, { automacao: 'Não – coberto pelos limites 18/60 automatizados' }),
  simulacao('CT-12', 'Idade 59 – logo abaixo do limite superior', 'RF-02', 'R-02', 'Valor limite (3 valores: 59)', 'Limite', 'Média', { ...ok, idade: 59 }, APROV, { automacao: 'Não – coberto pelos limites 18/60 automatizados' }),
  simulacao('CT-13', 'Renda exatamente 5x o valor', 'RF-03', 'R-03', 'Valor limite (renda = 5x)', 'Limite', 'Alta', { ...ok, renda: 5000, valor: 1000 }, APROV, { automacao: 'Sim – UT-06' }),
  simulacao('CT-14', 'Renda 1 centavo abaixo de 5x', 'RF-03', 'R-03', 'Valor limite (renda = 5x − 0,01)', 'Limite', 'Alta', { ...ok, renda: 4999.99, valor: 1000 }, NEG, { automacao: 'Sim – UT-07' }),
  simulacao('CT-15', 'Renda 2x o valor – partição inválida', 'RF-03', 'R-03', 'Partição de equivalência (classe inválida)', 'Negativo', 'Média', { ...ok, renda: 2000, valor: 1000 }, NEG, { automacao: 'Não – mesma partição de CT-14' }),
  simulacao('CT-16', 'Conta inativa com demais dados válidos', 'RF-04; RF-05', 'R-04; R-05', 'Tabela de decisão (regra R4)', 'Negativo', 'Alta', { ...ok, conta: 'nao' }, NEG, { automacao: 'Sim – UT-08, IT-05, E2E-04, PM-06' }),
  simulacao('CT-17', 'Nenhuma condição atendida', 'RF-05', 'R-05', 'Tabela de decisão (todas as condições falsas)', 'Negativo', 'Média', { idade: 17, renda: 100, valor: 1000, conta: 'nao' }, NEG, { automacao: 'Sim – UT-10' }),
  simulacao('CT-18', 'Idade e renda inválidas com conta ativa', 'RF-05', 'R-05', 'Tabela de decisão (duas condições falsas)', 'Negativo', 'Média', { idade: 61, renda: 3000, valor: 1000, conta: 'sim' }, NEG, { automacao: 'Não – combinação coberta por UT-10' }),
  simulacao('CT-19', 'Valor solicitado igual a zero', 'RF-07', 'R-07', 'Valor limite (valor = 0)', 'Exceção', 'Alta', { ...ok, valor: 0 }, INV, { automacao: 'Sim – UT-11' }),
  simulacao('CT-20', 'Valor solicitado negativo', 'RF-07', 'R-07', 'Partição de equivalência (classe inválida)', 'Exceção', 'Alta', { ...ok, valor: -100 }, INV, { automacao: 'Sim – UT-12, IT-06, PM-07' }),
  simulacao('CT-21', 'Idade em branco', 'RF-07', 'R-07', 'Teste de exceção (campo obrigatório vazio)', 'Exceção', 'Alta', { ...ok, idade: '' }, INV, { automacao: 'Sim – UT-13' }),
  simulacao('CT-22', 'Renda em branco', 'RF-07', 'R-07', 'Teste de exceção (campo obrigatório vazio)', 'Exceção', 'Alta', { ...ok, renda: '' }, INV, { automacao: 'Sim – UT-14' }),
  simulacao('CT-23', 'Renda negativa', 'RF-07', 'R-07', 'Partição de equivalência (classe inválida)', 'Exceção', 'Média', { ...ok, renda: -1 }, INV, { automacao: 'Não – mesma regra de CT-20' }),
  {
    id: 'CT-24', titulo: 'Dados inválidos não alteram o estado', requisitos: 'RF-06; RF-07', riscos: 'R-06', nivel: 'Sistema (interface)',
    tecnica: 'Teste baseado em estados (evento inválido)', tipo: 'Alternativo', prioridade: 'Média',
    preCondicoes: 'Usuário autenticado; estado Autenticado.', dados: 'Idade=30; Renda=5000; Valor=0; Conta ativa=Sim',
    passos: ['Fazer login.', 'Preencher valor solicitado 0 e demais campos válidos.', 'Clicar em "Simular empréstimo".', 'Observar mensagem e estado.'],
    esperado: { resultado: INV, estado: 'Autenticado' },
    automacao: 'Não – verificação visual de estado',
    async executar(h) { await h.login('admin', '1234'); await h.simular({ ...ok, valor: 0 }); return { resultado: await h.resultado(), estado: await h.estado() }; },
  },
  {
    id: 'CT-25', titulo: 'Transição Autenticado → Em Simulação', requisitos: 'RF-06', riscos: 'R-06', nivel: 'Sistema (interface)',
    tecnica: 'Teste baseado em estados', tipo: 'Positivo', prioridade: 'Alta',
    preCondicoes: 'Usuário autenticado; estado Autenticado.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Fazer login.', 'Preencher dados válidos.', 'Clicar em "Simular empréstimo".', 'Observar o estado atual.'],
    esperado: { estado: 'Em Simulação' },
    automacao: 'Sim – E2E-03',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.resultado(); return { estado: await h.estado() }; },
  },
  {
    id: 'CT-26', titulo: 'Transição Em Simulação → Finalizado', requisitos: 'RF-06', riscos: 'R-06', nivel: 'Sistema (interface)',
    tecnica: 'Teste baseado em estados', tipo: 'Positivo', prioridade: 'Alta',
    preCondicoes: 'Estado Em Simulação.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Fazer login.', 'Realizar uma simulação válida.', 'Clicar em "Finalizar".', 'Observar estado e mensagem.'],
    esperado: { estado: 'Finalizado', resultado: 'Simulação finalizada.' },
    automacao: 'Sim – E2E-06',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.resultado(); await h.finalizar(); return { estado: await h.estado(), resultado: await h.resultado() }; },
  },
  {
    id: 'CT-27', titulo: 'Finalizar sem ter simulado (transição inválida)', requisitos: 'RF-06', riscos: 'R-06', nivel: 'Sistema (interface)',
    tecnica: 'Teste baseado em estados (transição inválida)', tipo: 'Negativo', prioridade: 'Média',
    preCondicoes: 'Usuário autenticado; estado Autenticado; nenhuma simulação feita.', dados: '—',
    passos: ['Fazer login.', 'Sem simular, tentar clicar em "Finalizar".', 'Observar o estado atual.'],
    esperado: { estado: 'Autenticado' },
    automacao: 'Sim – E2E-05',
    async executar(h) { await h.login('admin', '1234'); await h.finalizar(); return { estado: await h.estado() }; },
  },
  {
    id: 'CT-28', titulo: 'Simular após Finalizado (transição inválida)', requisitos: 'RF-06', riscos: 'R-06', nivel: 'Sistema (interface)',
    tecnica: 'Teste baseado em estados (transição inválida)', tipo: 'Negativo', prioridade: 'Média',
    preCondicoes: 'Estado Finalizado.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Fazer login.', 'Simular com dados válidos.', 'Clicar em "Finalizar".', 'Tentar clicar em "Simular empréstimo" novamente.', 'Observar o estado.'],
    esperado: { estado: 'Finalizado' },
    automacao: 'Sim – E2E-06',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.resultado(); await h.finalizar(); await h.simular(ok); return { estado: await h.estado() }; },
  },
  {
    id: 'CT-29', titulo: 'Simulação registrada no histórico', requisitos: 'RF-08', riscos: 'R-08', nivel: 'Sistema (interface + API + arquivo)',
    tecnica: 'Teste baseado em casos de uso (fluxo principal)', tipo: 'Positivo', prioridade: 'Alta', somenteV2: true,
    preCondicoes: 'Usuário autenticado; histórico vazio.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Fazer login.', 'Simular com dados válidos.', 'Verificar a tabela "Histórico de simulações".'],
    esperado: { linhasHistorico: '1', ultimaLinha: 'APROVADO' },
    automacao: 'Sim – E2E-03, IT-04, PM-08',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.resultado(); const l = await h.historico(); return { linhasHistorico: String(l.length), ultimaLinha: l.at(-1)?.includes('APROVADO') ? 'APROVADO' : (l.at(-1) || '—') }; },
  },
  {
    id: 'CT-30', titulo: 'Histórico persiste após recarregar a página e reiniciar o servidor', requisitos: 'RF-08; RNF-04', riscos: 'R-08', nivel: 'Sistema (interface + API + arquivo)',
    tecnica: 'Teste de confiabilidade (reinício controlado)', tipo: 'Alternativo', prioridade: 'Alta', somenteV2: true,
    preCondicoes: 'Usuário autenticado; histórico vazio.', dados: '2 simulações (30 anos ativa; 30 anos inativa)',
    passos: ['Fazer login e realizar 2 simulações.', 'Parar e iniciar novamente o servidor (npm start).', 'Recarregar a página e fazer login.', 'Verificar o histórico.'],
    esperado: { linhasHistorico: '2' },
    automacao: 'Sim – IT-10, NF-09',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.resultado(); await h.simular({ ...ok, conta: 'nao' }); await h.aguardarLinhas(2); await h.reiniciarServidor(); await h.abrir(); await h.login('admin', '1234'); await h.aguardarLinhas(2); return { linhasHistorico: String((await h.historico()).length) }; },
  },
  {
    id: 'CT-31', titulo: 'Excluir simulação do histórico', requisitos: 'RF-09', riscos: 'R-09', nivel: 'Sistema (interface + API + arquivo)',
    tecnica: 'Teste baseado em casos de uso (fluxo alternativo)', tipo: 'Positivo', prioridade: 'Média', somenteV2: true,
    preCondicoes: 'Usuário autenticado; 1 simulação no histórico.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Fazer login e realizar 1 simulação.', 'Clicar em "Excluir" na linha da simulação.', 'Verificar o histórico.'],
    esperado: { linhasHistorico: '0', mensagemVazio: 'Nenhuma simulação registrada.' },
    automacao: 'Sim – E2E-07, IT-07, PM-09',
    async executar(h) { await h.login('admin', '1234'); await h.simular(ok); await h.aguardarLinhas(1); await h.excluirPrimeira(); await h.aguardarLinhas(0); return { linhasHistorico: String((await h.historico()).length), mensagemVazio: await h.texto('historicoVazio') }; },
  },
  {
    id: 'CT-32', titulo: 'Sair encerra a sessão', requisitos: 'RF-10; RF-06', riscos: 'R-10', nivel: 'Sistema (interface + API)',
    tecnica: 'Teste baseado em estados', tipo: 'Positivo', prioridade: 'Alta', somenteV2: true,
    preCondicoes: 'Usuário autenticado.', dados: '—',
    passos: ['Fazer login.', 'Clicar em "Sair".', 'Observar a tela exibida e o estado.', 'Recarregar a página.'],
    esperado: { telaLogin: 'visível', estado: 'Não autenticado', telaSimulacaoAposRecarregar: 'oculta' },
    automacao: 'Sim – E2E-08, IT-09, PM-11',
    async executar(h) { await h.login('admin', '1234'); await h.sair(); const r = { telaLogin: await h.visivel('login'), estado: await h.estado() }; await h.recarregar(); r.telaSimulacaoAposRecarregar = await h.appVisivel(); return r; },
  },
  {
    id: 'CT-33', titulo: 'Simulação sem autenticação (tela exibida via DevTools)', requisitos: 'RNF-03; RF-01', riscos: 'R-10', nivel: 'Sistema (segurança básica)',
    tecnica: 'Teste de segurança básica (controle de acesso)', tipo: 'Exceção', prioridade: 'Alta',
    preCondicoes: 'Tela de login aberta, sem autenticação.', dados: 'Idade=30; Renda=5000; Valor=1000; Conta ativa=Sim',
    passos: ['Abrir DevTools (F12) > Console.', 'Executar: document.getElementById("app").classList.remove("hidden")', 'Preencher dados válidos e clicar em "Simular empréstimo".', 'Observar se a simulação foi processada.'],
    esperado: { simulacaoProcessada: 'não' },
    automacao: 'Sim – IT-03, PM-04, NF-06',
    async executar(h) {
      await h.forcarTelaSemLogin();
      await h.simular(ok);
      await h.pausa(500);
      const txt = await h.textoBruto('result');
      return { simulacaoProcessada: /APROVADO|NEGADO/.test(txt) ? 'sim' : 'não' };
    },
  },
  {
    id: 'CT-34', titulo: 'Negação informa os motivos', requisitos: 'RF-11; RF-05', riscos: 'R-05', nivel: 'Sistema (interface + API)',
    tecnica: 'Tabela de decisão (motivos por condição falsa)', tipo: 'Negativo', prioridade: 'Média', criadoNoCiclo: 'C2',
    preCondicoes: 'Usuário autenticado. Caso criado após a evolução por TDD (RF-11).', dados: 'Idade=17; Renda=100; Valor=1000; Conta ativa=Não',
    passos: ['Fazer login.', 'Preencher idade 17, renda 100, valor 1000, conta inativa.', 'Clicar em "Simular empréstimo".', 'Ler a lista de motivos exibida.'],
    esperado: { resultado: NEG, quantidadeMotivos: '3' },
    automacao: 'Sim – UT-16, UT-17, IT-12, E2E-09',
    async executar(h) { await h.login('admin', '1234'); await h.simular({ idade: 17, renda: 100, valor: 1000, conta: 'nao' }); return { resultado: await h.resultado(), quantidadeMotivos: String((await h.itensMotivos()).length) }; },
  },
];

module.exports = { casos };
