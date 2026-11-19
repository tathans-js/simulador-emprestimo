'use strict';
/* Sessão exploratória (registro reproduzível): entradas não previstas no catálogo, enviadas à API. */
const fs = require('node:fs');
const path = require('node:path');
const { iniciarServidor } = require('../tests/apoio/servidor');

(async () => {
  const srv = await iniciarServidor();
  const login = await (await fetch(`${srv.url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'admin', senha: '1234' }) })).json();
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` };
  const base = { idade: 30, renda: 5000, valor: 1000, conta: 'sim' };
  const sondas = [
    ['Idade decimal 17.9', { ...base, idade: 17.9 }],
    ['Idade decimal 60.5', { ...base, idade: 60.5 }],
    ['Idade texto "abc"', { ...base, idade: 'abc' }],
    ['Idade com espaços " 30 "', { ...base, idade: ' 30 ' }],
    ['Conta com valor fora do domínio "talvez"', { ...base, conta: 'talvez' }],
    ['Conta ausente', { idade: 30, renda: 5000, valor: 1000 }],
    ['Renda e valor 1e308', { ...base, valor: 1e308, renda: 1e308 }],
    ['Idade 150', { ...base, idade: 150 }],
    ['Renda zero', { ...base, renda: 0 }],
    ['Campos extras no JSON (admin, id)', { ...base, admin: true, id: 999 }],
    ['Corpo de 200 KB', { ...base, lixo: 'x'.repeat(200000) }],
  ];
  const linhas = [];
  for (const [sonda, corpo] of sondas) {
    const r = await fetch(`${srv.url}/api/simulacoes`, { method: 'POST', headers: H, body: JSON.stringify(corpo) });
    const j = await r.json();
    linhas.push({ sonda, status: r.status, resultado: j.resultado || j.erro, idGravado: j.id ?? '—', motivos: (j.motivos || []).join(' ') });
  }
  const duplo = await Promise.all([1, 2].map(() => fetch(`${srv.url}/api/simulacoes`, { method: 'POST', headers: H, body: JSON.stringify(base) })));
  await Promise.all(duplo.map((d) => d.text()));
  const lista = await (await fetch(`${srv.url}/api/simulacoes`, { headers: H })).json();
  linhas.push({ sonda: 'Dois envios simultâneos (duplo clique)', status: duplo.map((d) => d.status).join(','), resultado: `${lista.length} registros no total`, idGravado: '—', motivos: '' });
  await srv.parar();
  const destino = path.join(__dirname, '..', 'resultados', 'exploratorio');
  fs.mkdirSync(destino, { recursive: true });
  fs.writeFileSync(path.join(destino, 'sessao-exploratoria.json'), JSON.stringify({ executadoEm: new Date().toISOString(), linhas }, null, 2));
  for (const l of linhas) console.log(`${l.sonda} | ${l.status} | ${l.resultado} | id ${l.idGravado} | ${l.motivos}`);
  process.exit(0);
})();
