# Plano e Relatório de Testes de Qualidade
## Sistema: Simulador de Empréstimo — versão 1.0 (com defeito intencional)

## 1. Como acessar o software

1. Baixe/extraia o arquivo `sistema_emprestimo_qa.zip`.
2. Abra a pasta `sistema_emprestimo_qa`.
3. Abra o arquivo `index.html` em Chrome, Edge ou Firefox.
4. Na tela de login use:
   - Usuário: `admin`
   - Senha: `1234`

Não é necessário instalar servidor, banco de dados ou qualquer programa adicional.

---

# 2. Requisitos do sistema

### RF01 — Login
O sistema deve permitir acesso somente com:
- Usuário: admin
- Senha: 1234

### RF02 — Idade
O empréstimo aceita clientes de **18 a 60 anos**, inclusive.

### RF03 — Renda
A renda mensal deve ser pelo menos **5 vezes** o valor solicitado.

### RF04 — Conta
A conta deve estar ativa.

### RF05 — Decisão
O empréstimo deve ser aprovado quando:
- idade válida E
- renda suficiente E
- conta ativa.

Caso contrário, deve ser negado.

### RF06 — Estados
Fluxo esperado:
Não autenticado → Autenticado → Em Simulação → Finalizado

---

# 3. Caso de uso principal

## UC01 — Simular empréstimo

**Pré-condição:** usuário está na tela de login.

**Fluxo principal:**
1. Informar usuário e senha corretos.
2. Sistema autentica.
3. Informar idade.
4. Informar renda.
5. Informar valor solicitado.
6. Informar se a conta está ativa.
7. Clicar em “Simular empréstimo”.
8. Sistema valida as regras.
9. Sistema exibe aprovado ou negado.

**Fluxos alternativos:**
- A1: usuário/senha inválidos → acesso negado.
- A2: requisitos financeiros não atendidos → empréstimo negado.
- A3: conta inativa → empréstimo negado.

---

# 4. Técnica 1 — Partição de Equivalência

Campo: idade, válida de 18 a 60.

| Partição | Faixa | Valor representativo | Resultado esperado |
|---|---:|---:|---|
| P1 válida | 18–60 | 30 | Aceitar |
| P2 inválida | menor que 18 | 17 | Rejeitar |
| P3 inválida | maior que 60 | 61 | Rejeitar |

### Casos executados

**CT01**
- Idade: 30
- Renda: R$ 5.000
- Solicitação: R$ 1.000
- Conta: ativa
- Esperado: APROVADO
- Resultado: APROVADO
- Status: PASSOU

**CT02**
- Idade: 17
- Renda: R$ 5.000
- Solicitação: R$ 1.000
- Conta: ativa
- Esperado: NEGADO
- Resultado: NEGADO
- Status: PASSOU

**CT03**
- Idade: 61
- Renda: R$ 5.000
- Solicitação: R$ 1.000
- Conta: ativa
- Esperado: NEGADO
- Resultado: NEGADO
- Status: PASSOU

**Resultado da técnica:** 3/3 PASSARAM.

---

# 5. Técnica 2 — Análise de Valor Limite

Para 18–60, testar:
- 17
- 18
- 60
- 61

**CT04**
- Idade: 17
- Esperado: NEGADO
- Resultado: NEGADO
- PASSOU

**CT05**
- Idade: 18
- Esperado: APROVADO
- Resultado: NEGADO
- **FALHOU**

**CT06**
- Idade: 60
- Esperado: APROVADO
- Resultado: NEGADO
- **FALHOU**

**CT07**
- Idade: 61
- Esperado: NEGADO
- Resultado: NEGADO
- PASSOU

**Resultado da técnica:** 2/4 PASSARAM; 2/4 FALHARAM.

## Defeito encontrado — BUG-001

**Descrição:** o sistema rejeita as idades 18 e 60, embora o requisito determine que a faixa seja inclusiva.

**Evidência técnica:** o código utiliza:
`age > 18 && age < 60`

O correto seria:
`age >= 18 && age <= 60`

**Severidade:** Alta, pois usuários legítimos nos dois limites são impedidos de obter aprovação.

---

# 6. Técnica 3 — Tabela de Decisão

Regras:

| Regra | Idade válida | Renda suficiente | Conta ativa | Resultado |
|---|---|---|---|---|
| R1 | Sim | Sim | Sim | APROVAR |
| R2 | Não | Sim | Sim | NEGAR |
| R3 | Sim | Não | Sim | NEGAR |
| R4 | Sim | Sim | Não | NEGAR |

### Execução

**CT08 — R1**
30 anos, renda 5x, conta ativa → APROVAR → PASSOU

**CT09 — R2**
17 anos, renda 5x, conta ativa → NEGAR → PASSOU

**CT10 — R3**
30 anos, renda menor que 5x, conta ativa → NEGAR → PASSOU

**CT11 — R4**
30 anos, renda 5x, conta inativa → NEGAR → PASSOU

**Resultado:** 4/4 PASSARAM.

Observação: CT08 usa 30 anos para não misturar a falha de limite encontrada no BUG-001.

---

# 7. Técnica 4 — Teste Baseado em Estado

Estados:

1. Não autenticado
2. Autenticado
3. Em Simulação
4. Finalizado

| Transição | Evento | Esperado | Resultado |
|---|---|---|---|
| Não autenticado → Autenticado | Login correto | Acessar sistema | PASSOU |
| Não autenticado → Não autenticado | Login incorreto | Permanecer bloqueado | PASSOU |
| Autenticado → Em Simulação | Clicar Simular | Mudar estado | PASSOU |
| Em Simulação → Finalizado | Clicar Finalizar | Encerrar simulação | PASSOU |

**Resultado:** 4/4 PASSARAM.

---

# 8. Técnica 5 — Teste Baseado em Casos de Uso

### UC01 — Login correto
Entrada: admin / 1234
Esperado: entrar no sistema
Resultado: entrou
**PASSOU**

### UC02 — Login inválido
Entrada: admin / senhaerrada
Esperado: mensagem de erro
Resultado: mensagem de erro
**PASSOU**

### UC03 — Empréstimo aprovado
30 anos, renda R$ 5.000, pedido R$ 1.000, conta ativa.
Esperado: aprovado.
Resultado: aprovado.
**PASSOU**

### UC04 — Conta inativa
30 anos, renda R$ 5.000, pedido R$ 1.000, conta inativa.
Esperado: negado.
Resultado: negado.
**PASSOU**

### UC05 — Limite mínimo
18 anos, renda R$ 5.000, pedido R$ 1.000, conta ativa.
Esperado: aprovado.
Resultado: negado.
**FALHOU — BUG-001**

---

# 9. Técnica 6 — Equivalência + Valor Limite

Esta técnica combina:
- valores representativos das partições;
- valores imediatamente antes/depois dos limites.

### Cobertura

| Valor | Categoria | Esperado | Resultado |
|---:|---|---|---|
| 17 | inválida inferior | Negar | Negar |
| 18 | limite inferior válido | Aprovar | Negar ❌ |
| 30 | válida | Aprovar | Aprovar |
| 60 | limite superior válido | Aprovar | Negar ❌ |
| 61 | inválida superior | Negar | Negar |

Conclusão: a técnica encontrou exatamente o defeito de fronteira.

---

# 10. Teste Exploratório

Além dos casos planejados, foram realizadas verificações livres:

- Login com campos vazios → sistema não entra.
- Login com senha errada → mensagem de erro.
- Renda abaixo do necessário → empréstimo negado.
- Conta inativa → empréstimo negado.
- Valor solicitado zero → dados inválidos.
- Valor solicitado negativo → dados inválidos.
- Finalização → estado muda para Finalizado.

Resultado: comportamento esperado nos cenários explorados.

---

# 11. Resumo dos resultados

| Técnica | Testes | Passou | Falhou |
|---|---:|---:|---:|
| Partição de Equivalência | 3 | 3 | 0 |
| Valor Limite | 4 | 2 | 2 |
| Tabela de Decisão | 4 | 4 | 0 |
| Estado | 4 | 4 | 0 |
| Casos de Uso | 5 | 4 | 1 |
| Equivalência + Limite | 5 | 3 | 2 |

As linhas se sobrepõem propositalmente: um mesmo cenário pode pertencer a mais de uma técnica.

---

# 12. Resultado final da versão 1.0

**BUG-001 encontrado:** idade 18 e 60 são rejeitadas incorretamente.

### Correção

Alterar no `index.html`:

De:
`const ageValid = age > 18 && age < 60;`

Para:
`const ageValid = age >= 18 && age <= 60;`

Após a correção, repetir obrigatoriamente CT05 e CT06.

### Resultado esperado após correção

- 17 → Negado
- 18 → Aprovado
- 30 → Aprovado
- 60 → Aprovado
- 61 → Negado

Todos devem PASSAR.

---

# 13. Conclusão de QA

O teste mostrou por que não basta testar apenas o "caminho feliz".

Se apenas o caso de 30 anos tivesse sido testado, o defeito teria passado despercebido.

A **Análise de Valor Limite** identificou o problema imediatamente ao testar as bordas 18 e 60.

Isso demonstra na prática a função de cada técnica:
- Partição reduz a quantidade de testes.
- Valor limite encontra falhas nas bordas.
- Tabela de decisão cobre combinações de regras.
- Estado valida as transições.
- Casos de uso validam o sistema pela perspectiva do usuário.
- Testes exploratórios procuram comportamentos inesperados.

**Conclusão da versão 1.0: REPROVADA para liberação**, até que o BUG-001 seja corrigido e os testes de regressão sejam executados novamente.
