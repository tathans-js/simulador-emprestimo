# Simulador de Empréstimo – Projeto P2 de Testes e Qualidade de Software

UNISAGRADO · Ciência da Computação · Testes e Qualidade de Software · Prof. Dr. Elvio Gilberto da Silva · 2026

> Os campos marcados com **«PREENCHER»** dependem de informações do grupo e devem ser completados antes da entrega.

## 1. Identificação dos integrantes

| Integrante | RA | Papel principal |
|---|---|---|
| Jonathans David da Silva P Jr | 23110246 | Coordenação e planejamento |
| Lucas Soares de Almeida | 23210133 | Análise e execução manual |
| Pedro Henrique Teixeira Moroni | 23110956 | Automação de testes |
| Guilherme de Oliveira Lazari | 23110982 | Qualidade, métricas e CI/CD |

> O manual (item 4.1) prevê duplas ou trios. Um grupo de quatro integrantes depende de autorização expressa do professor.

Turma: «PREENCHER» · Grupo: «PREENCHER: GRUPOXX»

## 2. Nome e versão do sistema

**Simulador de Empréstimo – versão 2.1.0** (versão testada e entregue). A versão original **1.0** (página única, sem servidor) está preservada em [`v1.0/`](v1.0/) como linha de base.

## 3. Link do repositório

«PREENCHER: https://github.com/USUARIO/simulador-emprestimo» (ver seção 11 para publicar).

## 4. Tecnologias

| Camada | Tecnologia |
|---|---|
| Interface | HTML5, CSS, JavaScript (navegador) |
| Servidor/API | Node.js 20+ (`node:http`, sem dependências de execução) |
| Persistência | Arquivo JSON (`data/simulacoes.json`), escrita atômica |
| Testes unitários e de integração | `node:test` (framework de testes nativo do Node.js, equivalente ao JUnit) |
| Testes de API | Postman (coleção v2.1) executada pelo Newman |
| Testes de sistema/interface | Selenium WebDriver 4 (Chrome e Firefox, modo headless) |
| Análise estática e cobertura | ESLint 9 e `node --test --experimental-test-coverage` |
| CI/CD | GitHub Actions (`.github/workflows/ci.yml`) |
| Documentação | Markdown → DOCX/PDF (pandoc + Chrome), planilhas XLSX (Python/openpyxl) |

Arquitetura: `navegador (public/)` ⇄ `API REST (src/servidor.js)` ⇄ `regras (src/regras.js)` + `autenticação (src/auth.js)` + `repositório (src/repositorio.js)` ⇄ `arquivo JSON`.

## 5. Pré-requisitos

- Node.js 20 ou superior (testado com 24.22.2) e npm.
- Google Chrome (e Mozilla Firefox para o teste de compatibilidade NF-04).
- Git.
- Opcional, apenas para regenerar documentos: Python 3.9+.

## 6. Instalação

```bash
git clone «URL-DO-REPOSITÓRIO» simulador-emprestimo
cd simulador-emprestimo
npm ci
```

O `npm ci` instala só as ferramentas de teste (Selenium, Newman, ESLint). O Selenium Manager baixa o driver do navegador na primeira execução, então é preciso ter internet nessa hora.

## 7. Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `3000` | Porta HTTP |
| `DATA_FILE` | `data/simulacoes.json` | Arquivo de persistência |
| `APP_USUARIO` / `APP_SENHA` | `admin` / `1234` | Credenciais **fictícias** de teste |
| `BROWSER` | `chrome` | Navegador dos testes Selenium (`chrome` ou `firefox`) |

## 8. Banco e dados

Os dados ficam em um arquivo JSON criado automaticamente na primeira gravação. Todos os dados são fictícios.
- **Restaurar o ambiente:** pare o servidor e apague `data/simulacoes.json`.
- Os testes automatizados usam sempre um arquivo temporário próprio, então não alteram os dados de demonstração.

## 9. Execução

```bash
npm start
```

Acesse http://localhost:3000. A versão 1.0 original abre direto no navegador: `v1.0/index.html`.

## 10. Execução dos testes

| Comando | O que executa | Quantidade |
|---|---|---|
| `npm run test:unit` | Unitários (`tests/unit`) | 18 |
| `npm run test:api` | Integração da API (`tests/api`) | 12 |
| `npm run test:postman` | Coleção Postman via Newman (`postman/`) | 12 requisições / 24 asserções |
| `npm run test:e2e` | Sistema/interface com Selenium (`tests/e2e`) | 9 |
| `npm run test:nf` | Não funcionais (`tests/nao-funcionais`) | 9 |
| `npm test` | unit + api + e2e | — |
| `npm run coverage` | Cobertura de código | — |
| `npm run lint` | Análise estática (ESLint) | — |
| `./scripts/pipeline_local.sh` | Mesmas etapas do pipeline, com log em `resultados/pipeline/` | — |
| `node scripts/executar_casos.js --alvo v2 --ciclo C3` | Execução assistida dos 34 casos manuais, com capturas | 34 |

Os resultados ficam em `resultados/`: execuções C0–C2 com capturas, logs de TDD e do pipeline, Postman, não funcionais e qualidade.

## 11. Acesso ao pipeline

O arquivo é `.github/workflows/ci.yml`. Ele roda em todo push e pull request: prepara o Node 20, roda `npm ci`, o ESLint, os testes unitários, de API, o Postman e o Selenium, mede a cobertura e publica os resultados como artefato.
Link: «PREENCHER: https://github.com/USUARIO/simulador-emprestimo/actions».

Para registrar no GitHub uma execução **com falha** seguida da **correção** (exigência do item 9.15):

```bash
git remote add origin «URL-DO-REPOSITÓRIO»
git push origin 1977789:refs/heads/main   # pipeline com falha (BUG-001/002/003)
git push origin main                       # pipeline aprovado após as correções
```

## 12. Localização dos documentos

| Produto | Local |
|---|---|
| P01–P03, P07, P09–P14 (DOCX/PDF) | `docs/` (fonte .md) e `docs/gerados/documentos/` (DOCX/PDF gerados) |
| Planilhas (P02, P04–P07, P10) | `docs/gerados/*.xlsx` |
| Evidências de execução manual | `resultados/execucoes/C0`, `C1`, `C2` |
| Defeitos | `docs/dados/defeitos.json`, `docs/gerados/P07_defeitos.*` |
| TDD | `resultados/tdd/` e commits `a44e590` → `263e841` → `ab1b0f7` |
| Pipeline | `.github/workflows/ci.yml`, `resultados/pipeline/` |

## 13. Credenciais fictícias

Usuário `admin`, senha `1234`. São credenciais de teste e não pertencem a nenhuma pessoa real.

## 14. Problemas conhecidos

- O primeiro `npm run test:e2e` pode levar alguns minutos, porque o Selenium Manager baixa o driver.
- As sessões ficam só na memória: reiniciar o servidor exige fazer login de novo (os dados continuam salvos).
- A persistência em arquivo JSON não foi projetada para vários usuários ao mesmo tempo (fora do escopo).
- O SonarQube não foi executado porque não havia Docker nem servidor SonarQube disponível. A análise de qualidade usou ESLint e cobertura (ver P11); é preciso pedir autorização ao professor para essa troca de ferramenta.

## 15. Contato do grupo

«PREENCHER: e-mails institucionais»
