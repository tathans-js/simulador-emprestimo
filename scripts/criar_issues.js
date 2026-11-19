'use strict';
/*
 * Cria no GitHub Issues os defeitos de docs/dados/defeitos.json (modelo do Apêndice G),
 * com rótulos de severidade, e encerra cada issue com o comentário de reteste.
 * Uso: node scripts/criar_issues.js DONO/REPOSITORIO   (requer gh autenticado)
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repo = process.argv[2];
if (!repo) { console.error('Uso: node scripts/criar_issues.js DONO/REPOSITORIO'); process.exit(1); }
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const defeitos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'dados', 'defeitos.json'), 'utf8'));

const CORES = { Alta: 'b60205', Média: 'fbca04', Baixa: '0e8a16' };
gh('label', 'create', 'defeito', '-R', repo, '--color', 'd73a4a', '--description', 'Defeito registrado pelo processo de teste', '--force');
for (const [sev, cor] of Object.entries(CORES)) {
  gh('label', 'create', `severidade: ${sev.toLowerCase()}`, '-R', repo, '--color', cor, '--force');
}

const links = [];
for (const d of defeitos) {
  const corpo = [
    `| Campo | Conteúdo |`, `|---|---|`,
    `| Requisito / caso | ${d.requisito} / ${d.casos} |`,
    `| Ambiente e versão | ${d.ambiente} |`,
    `| Pré-condições | ${d.preCondicoes} |`,
    `| Dados utilizados | ${d.dados} |`,
    `| Passos para reproduzir | ${d.passos} |`,
    `| Resultado esperado | ${d.esperado} |`,
    `| Resultado obtido | ${d.obtido} |`,
    `| Severidade / prioridade | ${d.severidade} / ${d.prioridade} |`,
    `| Evidências | ${d.evidencias} |`,
    `| Causa identificada | ${d.causa} |`,
  ].map((l) => l.replace(/\n/g, ' ')).join('\n');
  const url = gh('issue', 'create', '-R', repo, '--title', `${d.id}: ${d.titulo}`, '--body', corpo,
    '--label', 'defeito', '--label', `severidade: ${d.severidade.toLowerCase()}`);
  gh('issue', 'close', url, '-R', repo, '--comment',
    `Correção: ${d.correcao}\n\nHistórico de status: ${d.historico}\n\nVersão encontrada: ${d.versaoEncontrada} · Versão corrigida: ${d.versaoCorrigida}`);
  links.push({ id: d.id, url });
  console.log(`${d.id} -> ${url}`);
}
fs.mkdirSync(path.join(__dirname, '..', 'resultados'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'resultados', 'github-issues.json'), JSON.stringify(links, null, 2));
