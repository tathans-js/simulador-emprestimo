'use strict';
/* Remove caminhos absolutos da máquina local dos arquivos de resultados (privacidade/portabilidade). */
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '..');
const os = require('node:os');
function percorrer(dir) {
  for (const nome of fs.readdirSync(dir)) {
    const p = path.join(dir, nome);
    if (fs.statSync(p).isDirectory()) percorrer(p);
    else if (/\.(log|txt|json|xml|csv)$/.test(nome)) {
      const antes = fs.readFileSync(p, 'utf8');
      const depois = antes.split(raiz).join('.').split(os.homedir()).join('~');
      if (depois !== antes) fs.writeFileSync(p, depois);
    }
  }
}
percorrer(path.join(raiz, 'resultados'));
