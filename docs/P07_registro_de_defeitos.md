---
title: "P07 – Registro e acompanhamento de defeitos"
subtitle: "Simulador de Empréstimo – Projeto Integrado P2 – TQS 2026"
---

# 1. Resumo

Foram registrados 5 defeitos, todos encontrados em execuções reais (ciclos C0 e C1 e pipeline do commit `1977789`). Todos foram corrigidos, retestados no ciclo C2 e encerrados. Nenhum foi reaberto.

{{tabela:defeitos_resumo}}

**Ferramenta:** GitHub Issues («PREENCHER: link das issues»). A exportação consolidada está em `P07_defeitos.csv` e `P07_defeitos.xlsx`. Cada issue deve ser criada com o conteúdo abaixo e o rótulo de severidade. O status segue o fluxo Novo → Em análise → Em correção → Pronto para reteste → Encerrado.

> **Transparência sobre o BUG-001:** o código da v1.0 contém o comentário "BUG INTENCIONAL PARA O EXERCÍCIO DE QA". O defeito foi inserido de propósito pelo autor da v1.0 e não surgiu naturalmente. Ele foi mantido no registro porque existia de fato no código testado, mas a origem fica declarada aqui. Os defeitos BUG-002 a BUG-005 não foram inseridos de propósito: foram encontrados pela execução dos casos.

# 2. Relatórios detalhados (Apêndice G)

{{defeitos_detalhados}}

# 3. Observações da sessão exploratória (não registradas como defeito)

Os requisitos não definem o comportamento esperado nos itens abaixo. Por isso eles foram tratados como **oportunidades de melhoria**, e não como defeitos. Registrar como defeito exigiria primeiro alterar o requisito. Evidência: `resultados/exploratorio/sessao-exploratoria.json`.

| ID | Observação | Comportamento atual | Sugestão |
|---|---|---|---|
| OBS-01 | Idade com casas decimais | 17,9 e 60,5 são aceitas como número e negadas pela faixa | Definir no RF-07 que a idade é inteira e devolver 400 para decimais |
| OBS-02 | Campo "conta" fora do domínio (ex.: "talvez") ou ausente | Gravado e tratado como conta inativa (201, NEGADO) | Validar o domínio {sim, nao} e devolver 400 |
| OBS-03 | Dois envios simultâneos (duplo clique) | Duas simulações iguais gravadas | Desabilitar o botão enquanto a requisição estiver em andamento |
