---
title: "P03 – Plano de testes"
subtitle: "Simulador de Empréstimo 2.1.0 – Projeto Integrado P2 – TQS 2026"
---

# 1. Identificação e versão do sistema

Simulador de Empréstimo. Versão de linha de base: 1.0 (página única, `v1.0/index.html`). Versões testadas: 2.0.0 (commit `1977789`, antes das correções) e 2.1.0 (commit `b99bb99`, após as correções e o TDD). Repositório: https://github.com/tathans-js/simulador-emprestimo.

# 2. Objetivo

Mostrar, com evidências reproduzíveis, se o sistema atende aos 15 requisitos selecionados (RF-01 a RF-11 e RNF-01 a RNF-04), identificar e acompanhar defeitos até o encerramento e indicar os riscos residuais antes da liberação.

# 3. Escopo e fora do escopo

Estão descritos no P02, seção 1. Em resumo: entram os fluxos de login, simulação, decisão e motivos, validação, estados, histórico, exclusão e logout; ficam fora carga/estresse, multiusuário, HTTPS, Safari/Edge e acessibilidade completa.

# 4. Riscos

São 12 riscos (R-01 a R-12), descritos na matriz do P02. Riscos do próprio processo de teste:

| Risco do processo | Resposta |
|---|---|
| Falta de representante externo para a aceitação | Convidar colega de outro grupo; registrar as pendências |
| Ferramenta indisponível no laboratório (Docker/SonarQube) | ESLint + cobertura como alternativa, com pedido de autorização |
| Driver do navegador não baixado (sem internet) | Rodar `npm run test:e2e` antes da apresentação; ter vídeo de contingência |
| Dados de teste contaminados entre execuções | Arquivo de dados temporário por teste; `repositorio.limpar()` antes de cada caso |

# 5. Níveis e tipos de teste

| Nível | Finalidade | Ferramenta | Quantidade (mínimo) |
|---|---|---|---|
| Unitário | Regras isoladas (`src/regras.js`), sem rede nem interface | `node:test` | 18 (6) |
| Integração/API | Comunicação HTTP ⇄ regras ⇄ repositório ⇄ arquivo | `node:test` + `fetch`; Postman/Newman | 12 + 12 requisições (5) |
| Sistema/Interface | Fluxos ponta a ponta no navegador real | Selenium WebDriver | 9 (4) |
| Sistema (manual) | Casos especificados por técnica, com evidência | Navegador + executor assistido | 34 casos; 100 registros, 96 execuções em 3 ciclos (24) |
| Aceitação | Cenários do ponto de vista do usuário | Roteiro com representante | 4 cenários (4) |
| Não funcional | Desempenho, compatibilidade, segurança básica e confiabilidade | `node:test` + Selenium | 9 em 4 categorias (6 em 3) |

Tipos: funcional, regressão, reteste, segurança básica, desempenho básico, compatibilidade, confiabilidade e usabilidade (na aceitação).

**Justificativa da estratégia:** as regras de negócio têm o maior risco (R-02, R-03, R-05, R-07). Por isso recebem a maior quantidade de testes unitários, que são rápidos e baratos. A integração garante o contrato da API e a persistência. Poucos testes de interface cobrem os fluxos críticos, o que segue a pirâmide de testes.

# 6. Técnicas

| Técnica | Onde foi aplicada |
|---|---|
| Partição de equivalência | Login (CT-01 a CT-03), idade (CT-06), renda (CT-15), valores negativos (CT-20, CT-23) |
| Análise de valor limite | Idade 17/18/19 e 59/60/61 (CT-07 a CT-12); renda 5x e 5x − 0,01 (CT-13, CT-14); valor 0 (CT-19); "Admin" (CT-05) |
| Tabela de decisão | Combinações de idade, renda e conta (CT-06, CT-16 a CT-18) e os motivos (CT-34) |
| Teste baseado em estados | Transições válidas e inválidas (CT-24 a CT-28, CT-32) |
| Teste baseado em casos de uso | Histórico e exclusão (CT-29 a CT-31) e cenários de aceitação |
| Teste de exceção / segurança básica | Campos vazios (CT-04, CT-21, CT-22) e acesso sem login (CT-33) |
| Teste exploratório | Sessões livres registradas na seção 6.4 do relatório final |

# 7. Ambiente e ferramentas

- **Sistema operacional:** macOS 26.5 (estação local). No CI: Ubuntu (GitHub Actions).
- **Runtime:** Node.js 24.22.2 local e Node.js 22 no CI.
- **Navegadores:** Google Chrome 157 e Mozilla Firefox 160, em modo headless nos testes automatizados.
- **Ferramentas:** Git/GitHub, VS Code, `node:test`, Selenium WebDriver 4, Postman/Newman 6, ESLint 9, GitHub Actions, planilhas XLSX e Python 3.9 para gerar os documentos.
- **Gestão de defeitos:** GitHub Issues (https://github.com/tathans-js/simulador-emprestimo/issues?q=is%3Aissue), com exportação em `docs/gerados/P07_defeitos.csv`.

# 8. Responsabilidades

| Integrante (RA) | Papel | Contribuição |
|---|---|---|
| Jonathans David da Silva P Jr (23110246) | Coordenação e planejamento | Plano de testes (P03): estratégia em pirâmide, níveis, critérios de entrada, saída e suspensão, cronograma. Requisitos e riscos (P02): 15 requisitos e 12 riscos priorizados. Ficha do sistema (P01) e evolução da v1.0 para a v2.0 (interface + API + arquivo JSON). Integração do relatório final (P12), README e montagem da pasta do Drive. |
| Lucas Soares de Almeida (23210133) | Análise e execução manual | Catálogo de 34 casos (CT-01 a CT-34) com partição de equivalência, valor limite, tabela de decisão e estados. Execução dos ciclos C0, C1 e C2 (96 execuções com capturas). Registro dos defeitos BUG-001 a BUG-005 (P07) e das observações exploratórias OBS-01 a OBS-03. Matriz de rastreabilidade e cenários de aceitação AC-01 a AC-04 (P09). |
| Pedro Henrique Teixeira Moroni (23110956) | Automação de testes | 18 testes unitários das regras, 12 testes de integração da API, coleção Postman (12 requisições, 24 asserções) com Newman e 9 testes Selenium ponta a ponta. Ciclo TDD do RF-11: RED `a44e590`, GREEN `263e841`, REFACTOR `ab1b0f7`. |
| Guilherme de Oliveira Lazari (23110982) | Qualidade, métricas e CI/CD | Pipeline do GitHub Actions (`ci.yml`) e script local equivalente (falha em `1977789`, aprovação em `b99bb99`). 9 testes não funcionais. Análise de qualidade com ESLint e cobertura (31 → 10 avisos; 92,6% → 93,8% de linhas). Métricas, gráficos e planilhas (P10) e plano de melhoria M-01 a M-07 (P11). |

# 9. Dados de teste

São todos fictícios: usuário `admin`/`1234`, idades de 17 a 61, rendas de 100,00 a 10.000,00 e valores de −100 a 1.000. Os testes usam um arquivo de dados temporário; a demonstração usa `data/simulacoes.json`, que é restaurado quando apagado.

# 10. Critérios

**Entrada:**

- O sistema inicia com `npm start`.
- O `npm ci` termina sem erro.
- O catálogo de casos foi revisado.
- O ambiente usa somente dados fictícios.

**Saída:**

- 100% dos casos planejados foram executados.
- Nenhum defeito de severidade Alta ou Crítica está aberto.
- Todos os testes automatizados estão aprovados no pipeline.
- A cobertura de requisitos é de 100%.
- A cobertura de linhas é de pelo menos 85%.

**Suspensão:**

- O ambiente não inicia, ou
- um defeito bloqueia mais de 30% dos casos, ou
- os dados de teste foram corrompidos.

**Retomada:** depois da correção do bloqueio. Os casos afetados são reexecutados, junto com a regressão dos casos de prioridade Alta.

# 11. Cronograma

Cronograma planejado de um mês, do lançamento à entrega. A coluna "Realização registrada" mostra a data comprovada pelo histórico do repositório e pelos logs; marcos sem registro datado aparecem como "não registrada".

| Marco | Entrega esperada | Data planejada | Realização registrada |
|---|---|---|---|
| 0 – Lançamento | Leitura do manual, grupos | 20/10/2026 | não registrada |
| 1 – Fundamentos | Duas opções de sistema, níveis | 23/10/2026 | não registrada |
| 2 – Planejamento | Sistema aprovado, escopo, riscos, plano v1 | 27/10/2026 | não registrada |
| 3 – Especificação | Requisitos e catálogo v1 (versão 1.0: 15 casos) | 30/10/2026 | não registrada (versão 1.0 em `v1.0/`) |
| 4 – Execução e defeitos | Execução C0 na v1.0, BUG-001 | 03/11/2026 | C0 registrado em 19/11/2026 |
| 5 – Automação | Repositório, scripts, análise inicial | 06/11/2026 | 19/11/2026 (commits `8e64f72`, `1977789`) |
| 6 – Integração e sistema | API, Postman e Selenium | 10/11/2026 | 19/11/2026 |
| 7 – Aceitação e não funcionais | NF-01 a NF-09; aceitação | 12/11/2026 | 19/11/2026 (NF); aceitação pendente |
| 8 – Métricas | Planilha e gráficos | 14/11/2026 | 19/11/2026 |
| 9 – TDD, CI/CD e melhoria | RF-11, pipeline, plano de melhoria | 17/11/2026 | 19/11/2026 (commits `a44e590` a `ab1b0f7`; pipeline no GitHub) |
| Entrega final | Drive, relatório e apresentação | 19/11/2026 | 19/11/2026 |

# 12. Produtos, controle de versão e comunicação

- **Produtos:** P01 a P14 na estrutura de pastas 00 a 16 do Drive.
- **Controle de versão:** Git, com uma mensagem por mudança (`feat`, `fix(BUG-xxx)`, `test(TDD-RED)` etc.) e a v1.0 preservada.
- **Resultados:** versionados em `resultados/`, com data e commit no nome dos logs.
- **Comunicação:** aulas, Connect+ e o canal do grupo. Mudanças de escopo são registradas por escrito com o professor.
