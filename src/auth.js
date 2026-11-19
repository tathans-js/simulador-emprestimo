'use strict';
/**
 * Autenticação no servidor. Credenciais FICTÍCIAS de teste (admin / 1234),
 * configuráveis por variáveis de ambiente APP_USUARIO e APP_SENHA.
 */
const crypto = require('node:crypto');

function criarAutenticacao({ usuario, senha }) {
  const sessoes = new Map();

  return {
    login(u, s) {
      if (u !== usuario || s !== senha) return null;
      const token = crypto.randomBytes(24).toString('hex');
      sessoes.set(token, { usuario: u, criadaEm: Date.now() });
      return token;
    },
    validar(token) {
      return Boolean(token) && sessoes.has(token);
    },
    logout(token) {
      return sessoes.delete(token);
    },
  };
}

module.exports = { criarAutenticacao };
