---
title: "P03 – Plano de testes"
subtitle: "Simulador de Empréstimo 2.1.0 – Projeto Integrado P2 – TQS 2026"
---

# 1. Identificação e versão do sistema

Simulador de Empréstimo. Versão de linha de base: 1.0 (página única, `v1.0/index.html`). Versões testadas: 2.0.0 (commit `1977789`, antes das correções) e 2.1.0 (commit `b99bb99`, após as correções e o TDD). Repositório: «PREENCHER».

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
- **Runtime:** Node.js 24.22.2 local e Node.js 20 no CI.
- **Navegadores:** Google Chrome 157 e Mozilla Firefox 160, em modo headless nos testes automatizados.
- **Ferramentas:** Git/GitHub, VS Code, `node:test`, Selenium WebDriver 4, Postman/Newman 6, ESLint 9, GitHub Actions, planilhas XLSX e Python 3.9 para gerar os documentos.
- **Gestão de defeitos:** GitHub Issues («PREENCHER: link»), com exportação em `docs/gerados/P07_defeitos.csv`.

# 8. Responsabilidades

| Papel | Integrante | Responsabilidades |
|---|---|---|
| Coordenação e planejamento | «PREENCHER» | Plano, riscos, cronograma, integração dos documentos |
| Análise e execução manual | «PREENCHER» | Requisitos, casos, execuções, defeitos |
| Automação e qualidade | «PREENCHER» | Scripts, pipeline, métricas, TDD |

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

| Marco | Entrega esperada | Data real |
|---|---|---|
| 0 – Lançamento | Leitura do manual, grupos | «PREENCHER» |
| 1 – Fundamentos | Duas opções de sistema, níveis | «PREENCHER» |
| 2 – Planejamento | Sistema aprovado, escopo, riscos, plano v1 | «PREENCHER» |
| 3 – Especificação | Requisitos e catálogo v1 (versão 1.0: 15 casos) | «PREENCHER» |
| 4 – Execução e defeitos | Execução C0 na v1.0, BUG-001 | «PREENCHER»; C0 reexecutado em 19/11/2026 |
| 5 – Automação | Repositório, scripts, análise inicial | 19/11/2026 (commits `8e64f72`, `1977789`) |
| 6 – Integração e sistema | API, Postman e Selenium | 19/11/2026 |
| 7 – Aceitação e não funcionais | NF-01 a NF-09; aceitação | 19/11/2026 (NF); aceitação «PREENCHER» |
| 8 – Métricas | Planilha e gráficos | 19/11/2026 |
| 9 – TDD, CI/CD e melhoria | RF-11, pipeline, plano de melhoria | 19/11/2026 (commits `a44e590` a `ab1b0f7`) |
| Entrega final | Drive, relatório e apresentação | Data da P2 |

# 12. Produtos, controle de versão e comunicação

- **Produtos:** P01 a P14 na estrutura de pastas 00 a 16 do Drive.
- **Controle de versão:** Git, com uma mensagem por mudança (`feat`, `fix(BUG-xxx)`, `test(TDD-RED)` etc.) e a v1.0 preservada.
- **Resultados:** versionados em `resultados/`, com data e commit no nome dos logs.
- **Comunicação:** aulas, Connect+ e o canal do grupo. Mudanças de escopo são registradas por escrito com o professor.
