"""
Monta a pasta de entrega do Google Drive com a estrutura obrigatória 00–16 (item 11.3).

Uso:  python docs/ferramentas/montar_entrega.py [pasta_destino] [TURMA] [GRUPO (opcional)]
Padrão: ../entrega/P2_TQS_2026_CC-B_SIMULADOR-EMPRESTIMO
"""
import os
import shutil
import subprocess
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
turma = sys.argv[2] if len(sys.argv) > 2 else "CC-B"
grupo = sys.argv[3] if len(sys.argv) > 3 else ""
base = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "..", "entrega")
DEST = os.path.abspath(os.path.join(base, "_".join(x for x in ("P2_TQS_2026", turma, grupo, "SIMULADOR-EMPRESTIMO") if x)))
DOC = os.path.join(RAIZ, "docs", "gerados", "documentos")
GER = os.path.join(RAIZ, "docs", "gerados")


def pasta(nome):
    p = os.path.join(DEST, nome)
    os.makedirs(p, exist_ok=True)
    return p


def copiar(origem, destino_pasta, novo_nome=None):
    o = os.path.join(RAIZ, origem)
    d = os.path.join(destino_pasta, novo_nome or os.path.basename(origem.rstrip("/")))
    if os.path.isdir(o):
        shutil.copytree(o, d, dirs_exist_ok=True)
    else:
        shutil.copy2(o, d)


def doc(nome, destino_pasta):
    for ext in ("docx", "pdf"):
        copiar(os.path.join("docs", "gerados", "documentos", f"{nome}.{ext}"), destino_pasta)


def leia_me(destino_pasta, texto):
    with open(os.path.join(destino_pasta, "LEIA-ME.txt"), "w", encoding="utf-8") as f:
        f.write(texto.strip() + "\n")


if os.path.exists(DEST):
    shutil.rmtree(DEST)

p = pasta("00_IDENTIFICACAO_E_README")
copiar("README.md", p)
doc("P01_ficha_identificacao_sistema", p)
doc("COMPROVANTE_DE_ENTREGA", p)
leia_me(p, "README.md: instruções completas (integrantes, instalação, execução, testes, pipeline, documentos, credenciais fictícias).\n"
           "COMPROVANTE_DE_ENTREGA: preencher data/hora, marcar o checklist, assinar digitalmente e salvar como PDF.")

p = pasta("01_SISTEMA_ALVO")
subprocess.run(["git", "archive", "--format=zip", "-o", os.path.join(p, "simulador-emprestimo-2.1.0-codigo-fonte.zip"), "HEAD"], cwd=RAIZ, check=True)
copiar("v1.0", p, "versao-1.0-original")
leia_me(p, "Código-fonte completo da versão 2.1.0 (zip gerado com git archive) e a versão 1.0 original.\n"
           "Repositório: «PREENCHER: URL do GitHub». Execução: npm ci && npm start -> http://localhost:3000")

p = pasta("02_REQUISITOS_ESCOPO_RISCOS")
doc("P02_requisitos_escopo_riscos", p)
shutil.copy2(os.path.join(GER, "P02_requisitos_e_riscos.xlsx"), p)

p = pasta("03_PLANO_DE_TESTES")
doc("P03_plano_de_testes", p)

p = pasta("04_CASOS_E_RASTREABILIDADE")
shutil.copy2(os.path.join(GER, "P04_P05_catalogo_e_rastreabilidade.xlsx"), p)
copiar("tests/manuais/casos.js", p, "casos_fonte.js")

p = pasta("05_EXECUCAO_MANUAL")
shutil.copy2(os.path.join(GER, "P06_registro_de_execucao.xlsx"), p)
for c in ("C0", "C1", "C2"):
    copiar(f"resultados/execucoes/{c}", p, f"evidencias_{c}")
copiar("resultados/exploratorio", p, "sessao_exploratoria")
leia_me(p, "C0 = versão 1.0 original; C1 = versão 2.0.0 antes das correções; C2 = versão 2.1.0 (reteste e regressão).\n"
           "Cada pasta contém execucoes.csv/json e uma captura PNG por caso, carimbada com caso, execução, versão, data/hora e resultado.\n"
           "Executor: scripts/executar_casos.js (segue os passos do catálogo no navegador).")

p = pasta("06_DEFEITOS")
doc("P07_registro_de_defeitos", p)
shutil.copy2(os.path.join(GER, "P07_defeitos.xlsx"), p)
shutil.copy2(os.path.join(GER, "P07_defeitos.csv"), p)
leia_me(p, "Link das issues no GitHub: «PREENCHER».")

p = pasta("07_AUTOMACAO_UNITARIA")
copiar("tests/unit", p, "testes")
copiar("src/regras.js", p)
copiar("resultados/qualidade/cobertura-final.txt", p)
leia_me(p, "Comando: npm run test:unit (18 testes, node:test). Resultado: ver resultados do pipeline em 12_TDD_CICD_MELHORIA.")

p = pasta("08_INTEGRACAO_API")
copiar("tests/api", p, "testes")
copiar("postman", p, "postman")
copiar("resultados/postman", p, "resultados_newman")
leia_me(p, "Comandos: npm run test:api (12 testes) e npm run test:postman (coleção + ambiente exportados em JSON, 12 requisições / 24 asserções).")

p = pasta("09_SISTEMA_INTERFACE")
copiar("tests/e2e", p, "testes")
copiar("tests/apoio", p, "apoio")
leia_me(p, "Comando: npm run test:e2e (9 testes Selenium WebDriver, Chrome headless). Capturas em caso de falha: resultados/e2e/falhas/.")

p = pasta("10_ACEITACAO_NAO_FUNCIONAIS")
doc("P09_aceitacao_e_nao_funcionais", p)
copiar("tests/nao-funcionais", p, "testes_nao_funcionais")
copiar("resultados/nao-funcionais", p, "resultados_nao_funcionais")

p = pasta("11_METRICAS_E_QUALIDADE")
doc("P10_metricas_e_indicadores", p)
for x in ("P10_metricas.xlsx", "PLANILHA_MESTRE_P2.xlsx", "metricas.json"):
    shutil.copy2(os.path.join(GER, x), p)
copiar("docs/gerados/graficos", p, "graficos")
copiar("resultados/qualidade", p, "analise_de_qualidade")

p = pasta("12_TDD_CICD_MELHORIA")
doc("P11_tdd_cicd_melhoria", p)
copiar("resultados/tdd", p, "tdd_logs")
copiar("resultados/pipeline", p, "pipeline_logs")
copiar(".github/workflows/ci.yml", p)
with open(os.path.join(p, "historico_git.txt"), "w", encoding="utf-8") as f:
    f.write(subprocess.run(["git", "log", "--date=format:%d/%m/%Y %H:%M", "--pretty=format:%h  %ad  %s"], cwd=RAIZ, capture_output=True, text=True).stdout + "\n")

p = pasta("13_RELATORIO_FINAL")
doc("P12_relatorio_final", p)

p = pasta("14_APRESENTACAO_E_VIDEO_CONTINGENCIA")
for x in ("P13_apresentacao_final.pptx", "P13_apresentacao_final.pdf"):
    shutil.copy2(os.path.join(DOC, x), p)
doc("P13_roteiro_apresentacao", p)
leia_me(p, "PENDENTE: gravar o vídeo de contingência (MP4, 3–5 min) seguindo o roteiro (Demo A, B, C) e salvar nesta pasta.")

p = pasta("15_DIARIO_DE_PARTICIPACAO")
doc("P14_diario_de_participacao", p)

p = pasta("16_BACKUP_ENTREGA")
subprocess.run(["git", "bundle", "create", os.path.join(p, "repositorio-completo-com-historico.bundle"), "--all"], cwd=RAIZ, check=True, capture_output=True)
leia_me(p, "Backup do repositório com todo o histórico de commits (TDD, correções).\n"
           "Restaurar: git clone repositorio-completo-com-historico.bundle simulador-emprestimo")

total = sum(len(fs) for _, _, fs in os.walk(DEST))
print(f"Entrega montada em {DEST} ({total} arquivos)")
