---
title: "P01 – Ficha de identificação e aprovação do sistema"
subtitle: "Projeto Integrado P2 – Testes e Qualidade de Software – UNISAGRADO 2026"
---

# Ficha de proposta e aprovação do sistema (Apêndice A)

| Campo | Preenchimento do grupo |
|---|---|
| Turma e grupo | «PREENCHER: turma» – «PREENCHER: GRUPOXX» |
| Integrantes | Jonathans David da Silva P Jr (RA 23110246); Lucas Soares de Almeida (RA 23210133); Pedro Henrique Teixeira Moroni (RA 23110956); Guilherme de Oliveira Lazari (RA 23110982) |
| Nome do sistema | Simulador de Empréstimo |
| Versão testada | 2.1.0 (linha de base: 1.0) |
| Origem do sistema | Sistema acadêmico desenvolvido pelo grupo. A versão 1.0 (página única) foi evoluída para a 2.0 (cliente + API REST + persistência) para atender ao item 5.3 do manual. |
| Link do repositório | «PREENCHER: URL do GitHub» |
| Licença/autorização | Código próprio do grupo, para uso acadêmico (sem terceiros envolvidos). |
| Tecnologias principais | HTML/CSS/JavaScript; Node.js 20+ (`node:http`); persistência em arquivo JSON; `node:test`, Postman/Newman, Selenium WebDriver, ESLint, GitHub Actions. |
| Como executar | `npm ci` e `npm start` → http://localhost:3000 (detalhes no README). |
| Fluxos selecionados | (1) Login/autenticação; (2) Simulação de empréstimo com decisão e motivos; (3) Consulta do histórico persistido; (4) Exclusão de simulação; (5) Finalização da simulação (estados); (6) Encerrar sessão. Formulários: login e simulação. |
| Integrações existentes | Interface ⇄ API REST (fetch/JSON com token Bearer); API ⇄ módulo de regras; API ⇄ repositório ⇄ arquivo JSON. |
| Justificativa da escolha | Regras de negócio com faixas numéricas (boas para partição de equivalência e valor limite), combinações de condições (tabela de decisão), estados explícitos (teste baseado em estados), API e persistência (integração), interface web (Selenium). Tamanho viável para o semestre. |
| Riscos de viabilidade | Sem Docker no ambiente: SonarQube substituído por ESLint + cobertura (precisa de autorização). Download do driver do navegador exige internet na primeira execução. |
| Requisitos mínimos (item 5.3) | Código-fonte disponível ✔ · Ambiente local ✔ · 6 fluxos e 2 formulários ✔ · Persistência em arquivo ✔ · Integração interface-API-repositório ✔ · Dados fictícios e testes repetíveis ✔ · Disponível ao grupo ✔ · README com instruções ✔ |
| Decisão do professor | Aprovado / Aprovado com ajustes / Não aprovado – «PREENCHER» |
| Ajustes solicitados | «PREENCHER» |
| Data da aprovação | «PREENCHER» |

> **Observação 1:** o grupo tem quatro integrantes; o item 4.1 prevê duplas ou trios, então a composição depende de autorização expressa do professor.

> **Observação 2:** a evolução da v1.0 para a v2.0 (API e persistência) altera o sistema apresentado na proposta. É preciso confirmar com o professor que essa mudança de escopo foi aceita (item 4.4: mudanças de escopo devem ser registradas por escrito).
