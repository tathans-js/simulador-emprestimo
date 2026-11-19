---
title: "P09 – Testes de aceitação e não funcionais"
subtitle: "Simulador de Empréstimo 2.1.0 – Projeto Integrado P2 – TQS 2026"
---

# 1. Testes de aceitação

Os cenários foram escritos do ponto de vista do analista de crédito (usuário do sistema). O item 9.11 pede que eles sejam executados por **uma pessoa que não produziu os testes** (cliente real ou integrante de outro grupo). Essa execução **ainda não foi feita** e deve ser registrada pelo grupo nos campos «PREENCHER». A coluna "Pré-validação técnica" mostra que o fluxo foi verificado automaticamente e não substitui a decisão do representante.

| ID | Cenário (Dado / Quando / Então) | Dados | Critério de sucesso | Pré-validação técnica |
|---|---|---|---|---|
| AC-01 | **Dado** que estou logado, **quando** simulo para um cliente de 18 anos, renda R$ 5.000,00, pedido R$ 1.000,00 e conta ativa, **então** vejo "EMPRÉSTIMO APROVADO" e a simulação aparece no histórico. | 18; 5000; 1000; Sim | Concluir sem ajuda em até 2 min, sem erro | CT-08 e CT-29 aprovados (C2) |
| AC-02 | **Dado** que estou logado, **quando** simulo para um cliente com conta inativa, **então** vejo "EMPRÉSTIMO NEGADO" e o motivo "Conta inativa." para explicar ao cliente. | 30; 5000; 1000; Não | O representante entende o motivo sem explicação | CT-34 e E2E-09 aprovados |
| AC-03 | **Dado** que fiz duas simulações, **quando** excluo a simulação errada, **então** só ela some do histórico e o histórico continua lá depois de recarregar a página. | 2 simulações | Exclusão correta em até 1 min | CT-30 e CT-31 aprovados |
| AC-04 | **Dado** que terminei o atendimento, **quando** clico em Finalizar e depois em Sair, **então** volto para a tela de login e ninguém consegue ver o histórico sem nova senha. | — | Estado Finalizado → Não autenticado; recarregar não mostra a tela | CT-26, CT-32 e E2E-08 aprovados |

## 1.1 Registro de execução pelo representante do usuário

| Cenário | Representante (nome/grupo) | Data | Tempo | Erros/dificuldades | Satisfação (1–5) | Decisão (Aceito / Aceito com ressalvas / Não aceito) |
|---|---|---|---|---|---|---|
| AC-01 | «PREENCHER» | | | | | |
| AC-02 | «PREENCHER» | | | | | |
| AC-03 | «PREENCHER» | | | | | |
| AC-04 | «PREENCHER» | | | | | |

**Roteiro para o representante:** (1) leia apenas a coluna "Cenário"; (2) execute sem ajuda do grupo; (3) o grupo cronometra e anota onde houve hesitação; (4) o representante dá a nota de satisfação e a decisão. Essa execução também serve como teste de **usabilidade** (tempo, erros, compreensão e satisfação, item 9.12).

# 2. Testes não funcionais (Apêndice I)

Foram executados 9 testes em 4 categorias (o mínimo é 6 em 3), todos em ambiente local controlado e sem testes destrutivos. Comando: `npm run test:nf`. As medições estão em `resultados/nao-funcionais/nf-resultados.json` e as capturas na mesma pasta.

{{tabela:nf}}

**Interpretação:**

- **Desempenho:** a API respondeu muito abaixo do limite. O resultado vale apenas para um usuário local; não houve teste de carga, que está fora do escopo.
- **Compatibilidade:** o fluxo principal funcionou no Chrome e no Firefox e em tela de celular simulada (375x667).
- **Segurança básica:** todas as rotas protegidas recusam acesso sem token, e a senha não é enviada ao navegador (na v1.0 ela era — ver BUG-004).
- **Confiabilidade:** a escrita atômica manteve o arquivo íntegro depois do reinício controlado.
