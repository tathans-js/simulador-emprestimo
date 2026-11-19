#!/usr/bin/env bash
# Reproduz localmente as mesmas etapas do pipeline .github/workflows/ci.yml
# e grava o log em resultados/pipeline/<data>_<commit>.log
set -u
cd "$(dirname "$0")/.."
mkdir -p resultados/pipeline
LOG="resultados/pipeline/$(date +%Y%m%d-%H%M%S)_$(git rev-parse --short HEAD 2>/dev/null || echo sem-git).log"
status=0
etapa() {
  echo "::: $1" | tee -a "$LOG"
  shift
  if "$@" >>"$LOG" 2>&1; then echo "    OK" | tee -a "$LOG"; else echo "    FALHOU" | tee -a "$LOG"; status=1; fi
}
{ echo "Pipeline local - $(date '+%d/%m/%Y %H:%M:%S')"; echo "Commit: $(git log -1 --oneline 2>/dev/null)"; echo "Node: $(node --version)"; } | tee "$LOG"
etapa "Instalar dependências" npm ci --no-audit --no-fund
etapa "Análise estática (ESLint)" sh -c "npx eslint src public -f json -o resultados/eslint.json || true"
etapa "Testes unitários" npm run -s test:unit
etapa "Testes de integração (API)" npm run -s test:api
etapa "Testes de integração (Postman/Newman)" npm run -s test:postman
etapa "Testes de sistema (Selenium)" npm run -s test:e2e
echo "RESULTADO FINAL: $([ $status -eq 0 ] && echo APROVADO || echo REPROVADO)" | tee -a "$LOG"
node scripts/sanitizar_resultados.js
exit $status
