---
title: "P02 – Documento de requisitos, escopo e riscos"
subtitle: "Simulador de Empréstimo 2.1.0 – Projeto Integrado P2 – TQS 2026"
---

# 1. Escopo

**Incluído no escopo:** autenticação, regras de concessão (idade, renda e conta), decisão e motivos de negação, validação dos dados de entrada, estados da simulação, histórico persistido, exclusão de simulação, encerramento de sessão e as verificações não funcionais de desempenho básico, compatibilidade, segurança básica e confiabilidade.

**Fora do escopo:**

- Testes de carga e de estresse, além de qualquer teste destrutivo (item 9.12).
- Uso simultâneo por vários usuários e concorrência na gravação do arquivo JSON.
- HTTPS, expiração de sessão por tempo e cadastro de usuários (o sistema tem um único usuário fictício).
- Navegadores Safari e Edge, e dispositivos móveis físicos (a tela de celular é simulada com 375x667 no Chrome).
- Acessibilidade completa (WCAG) e testes de usabilidade com amostra estatística.
- Cálculo de juros e parcelas (o sistema não tem essa função).

# 2. Catálogo de requisitos (Apêndice B)

Total: 11 requisitos funcionais e 4 não funcionais, todos testáveis (mínimo: 6 + 2).

{{tabela:requisitos}}

# 3. Matriz de riscos (Apêndice C)

A classificação segue o item 9.3 do manual. Os riscos de prioridade **Alta** foram testados primeiro e repetidos depois das correções (ciclo C2).

{{tabela:riscos}}

# 4. Prioridades

1. **Alta:** R-01, R-02, R-03, R-05, R-07 e R-10. Executados no início do ciclo e repetidos na regressão.
2. **Média:** R-04, R-06, R-08 e R-12. Executados no ciclo principal.
3. **Baixa:** R-09 e R-11. Executados depois dos fluxos principais.
