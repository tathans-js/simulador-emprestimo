#!/usr/bin/env bash
# Publica o projeto no GitHub da conta logada no gh:
#  1) cria o repositório público
#  2) envia o commit 1977789 -> pipeline com FALHA (BUG-001/002/003)
#  3) envia o main -> pipeline APROVADO
#  4) cria e encerra as 5 issues de defeito
# Uso: ./scripts/publicar_github.sh [nome-do-repositorio]
set -euo pipefail
cd "$(dirname "$0")/.."
NOME="${1:-simulador-emprestimo}"

gh auth status >/dev/null 2>&1 || { echo "Faça login antes: gh auth login"; exit 1; }
DONO="$(gh api user --jq .login)"
REPO="$DONO/$NOME"
echo "Conta: $DONO  ·  Repositório: $REPO"

gh repo create "$REPO" --public --description "Simulador de Empréstimo - Projeto P2 de Testes e Qualidade de Software (UNISAGRADO 2026)"
gh auth setup-git
git remote remove github 2>/dev/null || true
git remote add github "https://github.com/$REPO.git"

aguardar_pipeline() {
  local sha="$1" id=""
  for _ in $(seq 1 30); do
    id="$(gh run list -R "$REPO" --commit "$sha" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
    [ -n "$id" ] && break
    sleep 5
  done
  [ -z "$id" ] && { echo "Pipeline não encontrado para $sha"; return 0; }
  gh run watch "$id" -R "$REPO" --exit-status >/dev/null 2>&1 || true
  gh run view "$id" -R "$REPO" --json url,conclusion --jq '"\(.conclusion)  \(.url)"'
}

FALHA_SHA="$(git rev-parse 1977789)"
echo "1/3 Enviando 1977789 (esperado: pipeline com FALHA)..."
git push github "$FALHA_SHA:refs/heads/main"
R1="$(aguardar_pipeline "$FALHA_SHA")"; echo "    $R1"

echo "2/3 Enviando main (esperado: pipeline APROVADO)..."
git push github main
R2="$(aguardar_pipeline "$(git rev-parse main)")"; echo "    $R2"

echo "3/3 Criando issues de defeito..."
node scripts/criar_issues.js "$REPO"

cat > resultados/github-links.json <<EOF
{
  "repositorio": "https://github.com/$REPO",
  "actions": "https://github.com/$REPO/actions",
  "issues": "https://github.com/$REPO/issues?q=is%3Aissue",
  "pipelineFalha": "${R1##* }",
  "pipelineAprovado": "${R2##* }"
}
EOF
echo
echo "Concluído. Links salvos em resultados/github-links.json:"
cat resultados/github-links.json
