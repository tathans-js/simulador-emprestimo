---
title: "P11 – Evidências de TDD, CI/CD e melhoria contínua"
subtitle: "Simulador de Empréstimo – Projeto Integrado P2 – TQS 2026"
---

# 1. Registro de TDD e CI/CD (Apêndice J)

| Etapa | Evidência e descrição |
|---|---|
| Comportamento escolhido | **RF-11:** ao negar o empréstimo, o sistema informa os motivos (idade fora da faixa, renda inferior a 5x, conta inativa), na ordem das regras. Hoje o usuário vê apenas "Requisitos não atendidos" e não sabe o que corrigir. |
| RED – teste falhando | Commit `a44e590` – `test(TDD-RED)`. Foram escritos UT-16, UT-17, UT-18, IT-12 e E2E-09 **antes** do código. Log `resultados/tdd/1-red.log`: unitários 15 aprovados / 3 reprovados, API 11/1, e2e 8/1. As falhas ocorreram pelo motivo esperado (`motivos` era `undefined`), e todos os testes anteriores continuaram aprovados. |
| GREEN – implementação mínima | Commit `263e841` – `feat(TDD-GREEN)`. Três `if` em `avaliarEmprestimo` montam a lista `motivos`, e a interface exibe a lista em `<ul>`. Log `resultados/tdd/2-green.log`: unitários 18/0, API 12/0, e2e 9/0. |
| REFACTOR – melhoria | Commit `ab1b0f7` – `refactor(TDD-REFACTOR)`. Foram criadas as constantes `IDADE_MINIMA`, `IDADE_MAXIMA` e `FATOR_RENDA`; os `if` viraram uma tabela `REGRAS` (condição + motivo); as rotas da API foram para um mapa com `ROTAS_PUBLICAS` e os códigos HTTP viraram constantes. Log `resultados/tdd/3-refactor.log`: todas as suítes continuam aprovadas (18, 12, Postman 24 asserções, 9). ESLint: 31 → 10 avisos. |
| Commits relacionados | `a44e590` (RED) → `263e841` (GREEN) → `ab1b0f7` (REFACTOR) → `b99bb99` (versão 2.1.0) |
| Pipeline – arquivo e gatilho | `.github/workflows/ci.yml`. Gatilhos: `push` (qualquer branch), `pull_request` e `workflow_dispatch`. Etapas: checkout → Node 20 → `npm ci` → ESLint → unitários → API → Postman/Newman → Selenium (Chrome headless) → cobertura → publicação dos resultados (artefato + resumo). |
| Pipeline – execução com falha | Execução local equivalente, com as mesmas etapas (`scripts/pipeline_local.sh`), no commit `1977789`: log `resultados/pipeline/20261119-175942_1977789.log`, **RESULTADO FINAL: REPROVADO** (unitários 5 falhas: BUG-001/002; Selenium 2 falhas: BUG-003). No GitHub Actions: «PREENCHER: link da execução com falha». |
| Pipeline – execução aprovada | Commit `b99bb99`: log `resultados/pipeline/20261119-180605_b99bb99.log`, **RESULTADO FINAL: APROVADO**. No GitHub Actions: «PREENCHER: link da execução aprovada». |
| Aprendizados e melhoria | Escrever o teste antes obrigou a definir a mensagem exata e a ordem dos motivos (decisão de requisito, não de código). O refactor só foi seguro porque as quatro suítes protegiam o comportamento. Ver o plano de melhoria na seção 3. |

> **Pendência importante (item 9.15):** o pipeline real precisa ser executado no GitHub. Os passos estão no README, seção 11: enviar primeiro o commit `1977789`, que gera a execução com falha, e depois o `main`, que gera a execução aprovada. Em seguida, coloque os links nesta tabela. Se o professor aceitar a demonstração local, os logs acima são a evidência equivalente. O item 9.15 exige autorização prévia para pipeline simulado.

# 2. Análise de qualidade (2 execuções)

O SonarQube não pôde ser executado porque não havia Docker nem servidor SonarQube disponível (item 8.4, ferramenta incompatível com o ambiente). Como substituto, que **precisa de autorização do professor**, foram usados ESLint 9, com regras de complexidade, tamanho de função, profundidade e números mágicos, e a cobertura de código do `node:test`.

| Medida | Linha de base (`1977789`) | Final (`b99bb99`) |
|---|---|---|
| Erros ESLint | 0 | 0 |
| Avisos ESLint | 31 | 10 |
| `no-magic-numbers` | 28 | 9 |
| `max-lines-per-function` | 2 | 1 |
| `complexity` | 1 | 0 |
| Cobertura de linhas | 92,59% | 93,80% |
| Cobertura de ramos | 89,61% | 91,01% |
| Cobertura de funções | 89,29% | 90,70% |

Arquivos: `resultados/qualidade/eslint-linha-de-base.json`, `eslint-final.json`, `cobertura-linha-de-base.txt` e `cobertura-final.txt`.

# 3. Plano de melhoria contínua

| # | Ação | Origem | Prioridade | Responsável | Critério de verificação |
|---|---|---|---|---|---|
| M-01 | Rodar o pipeline real no GitHub (falha + correção) e ativar proteção da branch `main` exigindo CI verde | Item 9.15 | Alta | «PREENCHER» | Duas execuções com links; merge bloqueado com CI vermelho |
| M-02 | Validar o domínio do campo `conta` ({sim, nao}) e exigir idade inteira (API 400) | OBS-01, OBS-02 | Alta | «PREENCHER» | Novos UT/IT por TDD; sessão exploratória sem 201 para essas entradas |
| M-03 | Desabilitar "Simular" durante a requisição (evitar duplicidade) | OBS-03 | Média | «PREENCHER» | E2E com duplo clique gera 1 registro |
| M-04 | Executar o SonarQube (SonarCloud via GitHub Actions) e comparar com o ESLint | Item 9.16 | Média | «PREENCHER» | Relatório SonarCloud com Quality Gate aprovado |
| M-05 | Zerar os 10 avisos ESLint restantes (constantes HTTP no cliente; dividir `criarServidor`) | Análise de qualidade | Baixa | «PREENCHER» | `npm run lint` com 0 avisos e testes verdes |
| M-06 | Expiração de sessão por tempo e limite de tentativas de login | Risco R-10 | Média | «PREENCHER» | IT de token expirado retorna 401; 5 falhas bloqueiam por 1 min |
| M-07 | Executar a aceitação com representante externo e repetir a usabilidade após os ajustes | Item 9.11 | Alta | «PREENCHER» | 4 cenários com decisão "Aceito" |
