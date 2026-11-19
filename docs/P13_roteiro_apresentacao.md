---
title: "P13 – Roteiro da apresentação e demonstração"
subtitle: "Simulador de Empréstimo – Projeto Integrado P2 – TQS 2026"
---

# 1. Estrutura (12 a 15 minutos + 5 de perguntas)

| Tempo | Bloco (item 13.1) | Slides | Apresentador |
|---|---|---|---|
| 0:00–1:30 | 1. Sistema, objetivo e escopo | 1–3 | Jonathans David da Silva P Jr |
| 1:30–3:00 | 2. Riscos e estratégia de teste | 4–5 | Jonathans David da Silva P Jr |
| 3:00–5:30 | 3. Caso manual, evidência e defeito (BUG-001) **+ demonstração ao vivo** | 6–7 | Lucas Soares de Almeida |
| 5:30–8:30 | 4. Testes automatizados em dois níveis **(demonstração)** | 8–9 | Pedro Henrique Teixeira Moroni |
| 8:30–10:30 | 5. Aceitação, não funcionais e métricas | 10–11 | Lucas Soares de Almeida (aceitação) e Guilherme de Oliveira Lazari (não funcionais e métricas) |
| 10:30–13:00 | 6. TDD e pipeline **(demonstração)** | 12–13 | Pedro Henrique Teixeira Moroni (TDD) e Guilherme de Oliveira Lazari (pipeline) |
| 13:00–14:30 | 7. Conclusão e melhorias | 14 | Jonathans David da Silva P Jr |

# 2. Preparação (antes da aula)

1. Rodar `npm ci` e `npm run test:e2e` **com internet**, para que o driver do navegador fique em cache.
2. Restaurar os dados de demonstração: `rm -f data/simulacoes.json`.
3. Abrir 3 abas do terminal na pasta do projeto e 1 do navegador em `v1.0/index.html`.
4. Deixar abertos `resultados/execucoes/C1/CT-08.png` e `C2/CT-08.png`.
5. Ter o vídeo de contingência na pasta 14 do Drive e no computador.

# 3. Roteiro da demonstração

**Demo A – defeito de fronteira (bloco 3):**

1. Abra `v1.0/index.html` e entre com admin/1234.
2. Simule 30 anos, renda 5000, pedido 1000, conta ativa → APROVADO.
3. Simule 18 anos com os mesmos dados → **NEGADO**. Explique o valor limite e o BUG-001.
4. Rode `npm start`, abra http://localhost:3000 e faça a mesma simulação com 18 anos → **APROVADO**, e a linha aparece no histórico.
5. Simule com conta inativa → NEGADO com o motivo "Conta inativa." (RF-11).

**Demo B – automação em dois níveis (bloco 4):**

```bash
npm run test:unit
npm run test:postman
npm run test:e2e
```

- `npm run test:unit` → 18 aprovados; aponte `UT-03 [RF-02/CT-08]`.
- `npm run test:postman` → 12 requisições / 24 asserções.
- `npm run test:e2e` → 9 aprovados (Selenium, Chrome headless).

**Demo C – TDD e pipeline (bloco 6):**

```bash
git log --oneline
git checkout a44e590 && npm run test:unit
git checkout main && npm run test:unit
```

1. `git log --oneline` → mostre a sequência RED `a44e590` → GREEN `263e841` → REFACTOR `ab1b0f7`.
2. `git checkout a44e590 && npm run test:unit` → 3 falhas (RED).
3. `git checkout main && npm run test:unit` → tudo verde.
4. Abra a aba Actions do GitHub e mostre a execução com falha e a aprovada. Sem internet, use `resultados/pipeline/*.log`.

# 4. Perguntas prováveis (cada integrante deve saber responder)

- Por que 18 e 60 precisam de casos próprios se 30 já passou? (partição × valor limite)
- Por que BUG-005 não existia na v1.0? (a validação nativa do `<form>` com `min="0"` foi introduzida na v2.0)
- Qual a diferença entre o IT-04 e o E2E-03? (o nível: API × interface)
- Como vocês garantem que os testes não dependem de dados anteriores? (arquivo temporário e `limpar()` antes de cada caso)
- Por que não SonarQube? (sem Docker no ambiente; substituto ESLint + cobertura, com autorização)
- O que falta para o sistema ir para produção? (M-02, M-06, aceitação, persistência adequada)
