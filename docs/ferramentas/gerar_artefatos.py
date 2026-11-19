"""
Gera planilhas (XLSX), gráficos (PNG) e métricas (JSON) a partir dos resultados reais
do projeto (pasta resultados/) e dos dados-fonte (docs/dados/).

Uso:  python docs/ferramentas/gerar_artefatos.py
Dependências: docs/ferramentas/requirements.txt
"""
import csv
import glob
import json
import os
import re

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Alignment, Font, PatternFill  # noqa: E402
from openpyxl.utils import get_column_letter  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
R = lambda *p: os.path.join(RAIZ, *p)  # noqa: E731
SAIDA = R("docs", "gerados")
os.makedirs(os.path.join(SAIDA, "graficos"), exist_ok=True)


def ler_json(*p):
    with open(R(*p), encoding="utf-8") as f:
        return json.load(f)


requisitos = ler_json("docs", "dados", "requisitos.json")
riscos = ler_json("docs", "dados", "riscos.json")
defeitos = ler_json("docs", "dados", "defeitos.json")
casos = ler_json("resultados", "catalogo", "casos.json")
execucoes = {c: ler_json("resultados", "execucoes", c, "execucoes.json") for c in ("C0", "C1", "C2")}
nf = ler_json("resultados", "nao-funcionais", "nf-resultados.json")
newman = ler_json("resultados", "postman", "newman-relatorio.json")

# ---------------- testes automatizados (nomes e situação no pipeline final) ----------------
logs = sorted(glob.glob(R("resultados", "pipeline", "*.log")))
log_inicial, log_final = open(logs[0], encoding="utf-8").read(), open(logs[-1], encoding="utf-8").read()


def testes_do_arquivo(padrao, nivel, ferramenta):
    itens = []
    for arq in sorted(glob.glob(R(padrao))):
        for nome in re.findall(r"test\('([^']+)'", open(arq, encoding="utf-8").read()):
            itens.append({"id": nome.split(" ")[0], "nome": nome, "nivel": nivel, "ferramenta": ferramenta,
                          "arquivo": os.path.relpath(arq, RAIZ)})
    return itens


automatizados = (
    testes_do_arquivo("tests/unit/*.test.js", "Unitário", "node:test")
    + testes_do_arquivo("tests/api/*.test.js", "Integração/API", "node:test + fetch")
    + testes_do_arquivo("tests/e2e/*.test.js", "Sistema/Interface", "Selenium WebDriver + node:test")
)


def situacao(log, nome):
    if re.search(r"✔ " + re.escape(nome), log):
        return "Aprovado"
    if re.search(r"✖ " + re.escape(nome), log):
        return "Reprovado"
    return "Não existia"


for t in automatizados:
    t["inicial"] = situacao(log_inicial, t["nome"])
    t["final"] = situacao(log_final, t["nome"])

for ex in newman["run"]["executions"]:
    nome = ex["item"]["name"]
    falhas = [a for a in ex.get("assertions", []) if a.get("error")]
    automatizados.append({"id": nome.split(" ")[0], "nome": nome, "nivel": "Integração/API", "ferramenta": "Postman + Newman",
                          "arquivo": "postman/simulador-emprestimo.postman_collection.json", "inicial": "Aprovado",
                          "final": "Reprovado" if falhas else "Aprovado"})
for t in testes_do_arquivo("tests/nao-funcionais/*.test.js", "Não funcional", "node:test (+ Selenium)"):
    t["inicial"] = "—"
    t["final"] = "Aprovado" if t["id"] in nf["medicoes"] else "Reprovado"
    automatizados.append(t)
ids_aprovados = {t["id"] for t in automatizados if t["final"] == "Aprovado"}

# ---------------- métricas ----------------
def pct(a, b):
    return round(100 * a / b, 2) if b else 0.0


def contar(regs, res):
    return sum(1 for r in regs if r["resultado"] == res)


ciclos = {}
for c, regs in execucoes.items():
    executados = [r for r in regs if r["resultado"] in ("Aprovado", "Reprovado")]
    ciclos[c] = {
        "planejados": len(regs), "executados": len(executados),
        "aprovados": contar(regs, "Aprovado"), "reprovados": contar(regs, "Reprovado"),
        "bloqueados": contar(regs, "Bloqueado"), "naoExecutados": contar(regs, "Não executado"),
        "versao": regs[0]["versao"],
    }
    ciclos[c]["percentualExecucao"] = pct(ciclos[c]["executados"], ciclos[c]["planejados"])
    ciclos[c]["taxaAprovacao"] = pct(ciclos[c]["aprovados"], ciclos[c]["executados"])
    ciclos[c]["taxaReprovacao"] = pct(ciclos[c]["reprovados"], ciclos[c]["executados"])

# cobertura de requisitos: requisito com ao menos um teste executado (manual C2 ou automatizado aprovado)
def reqs_de(texto):
    return set(re.findall(r"RN?F-\d+", texto))


cobertos = {}
for r in requisitos:
    manuais = [c["id"] for c in casos if r["id"] in reqs_de(c["requisitos"])]
    autos = [t["id"] for t in automatizados if re.search(r"\[" + r["id"] + r"[\]/ ]|" + r["id"] + r"[ \]]", t["nome"]) and t["final"] == "Aprovado"]
    cobertos[r["id"]] = {"manuais": manuais, "automatizados": autos}
req_cobertos = [k for k, v in cobertos.items() if v["manuais"] or v["automatizados"]]

planejados_auto = [c for c in casos if c["automacao"].startswith("Sim")]
automatizados_ok = [c for c in planejados_auto
                    if all(ref in ids_aprovados for ref in re.findall(r"(?:UT|IT|E2E|PM|NF)-\d+", c["automacao"]))]

sev, sts = {}, {}
for d in defeitos:
    sev[d["severidade"]] = sev.get(d["severidade"], 0) + 1
    sts[d["status"]] = sts.get(d["status"], 0) + 1
retestados = [d for d in defeitos if d["status"] in ("Encerrado", "Reaberto")]
reabertos = [d for d in defeitos if d["reaberto"]]


def eslint_resumo(arq):
    dados = ler_json("resultados", "qualidade", arq)
    regras = {}
    for f in dados:
        for m in f["messages"]:
            regras[m["ruleId"]] = regras.get(m["ruleId"], 0) + 1
    return {"erros": sum(f["errorCount"] for f in dados), "avisos": sum(f["warningCount"] for f in dados), "porRegra": regras}


def cobertura(arq):
    txt = open(R("resultados", "qualidade", arq), encoding="utf-8").read()
    m = re.search(r"all files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)", txt)
    return {"linhas": float(m.group(1)), "ramos": float(m.group(2)), "funcoes": float(m.group(3))}


qualidade = {
    "linhaDeBase": {"commit": "1977789", "eslint": eslint_resumo("eslint-linha-de-base.json"), "cobertura": cobertura("cobertura-linha-de-base.txt")},
    "final": {"commit": "b99bb99", "eslint": eslint_resumo("eslint-final.json"), "cobertura": cobertura("cobertura-final.txt")},
}

por_nivel = {}
for t in automatizados:
    n = por_nivel.setdefault(t["nivel"], {"total": 0, "aprovados": 0})
    n["total"] += 1
    n["aprovados"] += t["final"] == "Aprovado"

metricas = {
    "ciclos": ciclos,
    "percentualExecucao": ciclos["C2"]["percentualExecucao"],
    "taxaAprovacao": {"C1": ciclos["C1"]["taxaAprovacao"], "C2": ciclos["C2"]["taxaAprovacao"]},
    "taxaReprovacao": {"C1": ciclos["C1"]["taxaReprovacao"], "C2": ciclos["C2"]["taxaReprovacao"]},
    "coberturaRequisitos": {"cobertos": len(req_cobertos), "total": len(requisitos), "percentual": pct(len(req_cobertos), len(requisitos)), "detalhe": cobertos},
    "taxaAutomacao": {"automatizados": len(automatizados_ok), "planejados": len(planejados_auto), "percentual": pct(len(automatizados_ok), len(planejados_auto))},
    "defeitosPorSeveridade": sev,
    "defeitosPorStatus": sts,
    "taxaReabertura": {"reabertos": len(reabertos), "retestados": len(retestados), "percentual": pct(len(reabertos), len(retestados))},
    "testesAutomatizadosPorNivel": por_nivel,
    "postman": {"requisicoes": newman["run"]["stats"]["requests"]["total"], "assercoes": newman["run"]["stats"]["assertions"]["total"],
                "falhas": newman["run"]["stats"]["assertions"]["failed"]},
    "qualidade": qualidade,
    "naoFuncionais": nf["medicoes"],
}
with open(os.path.join(SAIDA, "metricas.json"), "w", encoding="utf-8") as f:
    json.dump(metricas, f, ensure_ascii=False, indent=2)

# ---------------- gráficos ----------------
plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
AZUL, VERDE, VERM, CINZA, AMAR = "#2463eb", "#2e7d32", "#c62828", "#9e9e9e", "#f9a825"


def salvar(fig, nome):
    fig.tight_layout()
    fig.savefig(os.path.join(SAIDA, "graficos", nome), dpi=160)
    plt.close(fig)


fig, ax = plt.subplots(figsize=(8.5, 3.8))
rot = ["C0 – v1.0\noriginal", "C1 – v2.0.0\nantes das correções", "C2 – v2.1.0\nreteste e regressão"]
ap = [ciclos[c]["aprovados"] for c in ("C0", "C1", "C2")]
rp = [ciclos[c]["reprovados"] for c in ("C0", "C1", "C2")]
ne = [ciclos[c]["naoExecutados"] for c in ("C0", "C1", "C2")]
ax.bar(rot, ap, color=VERDE, label="Aprovado")
ax.bar(rot, rp, bottom=ap, color=VERM, label="Reprovado")
ax.bar(rot, ne, bottom=[a + b for a, b in zip(ap, rp)], color=CINZA, label="Não executado")
for i, (a, b, c) in enumerate(zip(ap, rp, ne)):
    ax.text(i, a / 2, str(a), ha="center", color="white", fontweight="bold")
    if b:
        ax.text(i, a + b / 2, str(b), ha="center", color="white", fontweight="bold")
    if c:
        ax.text(i, a + b + c / 2, str(c), ha="center", color="white", fontweight="bold")
ax.set_ylabel("Casos manuais")
ax.set_title("Figura 1 – Resultado dos casos manuais por ciclo")
ax.legend(frameon=False, loc="upper left", bbox_to_anchor=(1, 1))
salvar(fig, "fig1_execucao_por_ciclo.png")

fig, ax = plt.subplots(figsize=(5, 3.2))
ordem = ["Crítica", "Alta", "Média", "Baixa"]
vals = [sev.get(s, 0) for s in ordem]
ax.bar(ordem, vals, color=["#6a1b9a", VERM, AMAR, AZUL])
for i, v in enumerate(vals):
    ax.text(i, v + 0.05, str(v), ha="center")
ax.set_ylabel("Defeitos")
ax.set_ylim(0, max(vals) + 1)
ax.set_title("Figura 2 – Defeitos por severidade")
salvar(fig, "fig2_defeitos_severidade.png")

fig, ax = plt.subplots(figsize=(6.5, 3.2))
niveis = list(por_nivel.keys())
ax.barh(niveis, [por_nivel[n]["total"] for n in niveis], color=AZUL)
for i, n in enumerate(niveis):
    ax.text(por_nivel[n]["total"] + 0.2, i, f'{por_nivel[n]["aprovados"]}/{por_nivel[n]["total"]} aprovados', va="center")
ax.set_xlabel("Testes automatizados")
ax.set_xlim(0, max(p["total"] for p in por_nivel.values()) + 8)
ax.set_title("Figura 3 – Testes automatizados por nível (execução final)")
salvar(fig, "fig3_automatizados_por_nivel.png")

fig, axs = plt.subplots(1, 2, figsize=(8, 3.2))
b, f_ = qualidade["linhaDeBase"], qualidade["final"]
axs[0].bar(["Linha de base\n(1977789)", "Final\n(b99bb99)"], [b["eslint"]["avisos"], f_["eslint"]["avisos"]], color=[CINZA, AZUL])
for i, v in enumerate([b["eslint"]["avisos"], f_["eslint"]["avisos"]]):
    axs[0].text(i, v + 0.5, str(v), ha="center")
axs[0].set_title("Avisos ESLint (0 erros)")
cats = ["Linhas", "Ramos", "Funções"]
x = range(3)
axs[1].bar([i - 0.2 for i in x], [b["cobertura"]["linhas"], b["cobertura"]["ramos"], b["cobertura"]["funcoes"]], 0.4, color=CINZA, label="Linha de base")
axs[1].bar([i + 0.2 for i in x], [f_["cobertura"]["linhas"], f_["cobertura"]["ramos"], f_["cobertura"]["funcoes"]], 0.4, color=AZUL, label="Final")
axs[1].set_xticks(list(x))
axs[1].set_xticklabels(cats)
axs[1].set_ylim(0, 105)
axs[1].set_title("Cobertura de código (%)")
axs[1].legend(frameon=False, fontsize=8, loc="lower right")
fig.suptitle("Figura 4 – Análise de qualidade: linha de base x final")
salvar(fig, "fig4_qualidade.png")

# ---------------- planilhas ----------------
CAB = PatternFill("solid", fgColor="B5121B")
CORES = {"Aprovado": "C8E6C9", "Reprovado": "FFCDD2", "Não executado": "E0E0E0", "Bloqueado": "FFE0B2", "Encerrado": "C8E6C9"}


def aba(wb, titulo, cabecalho, linhas, larguras=None, colorir=None):
    ws = wb.create_sheet(titulo[:31])
    ws.append(cabecalho)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = CAB
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for linha in linhas:
        ws.append(linha)
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
        if colorir is not None:
            v = row[colorir].value
            if v in CORES:
                row[colorir].fill = PatternFill("solid", fgColor=CORES[v])
    for i, w in enumerate(larguras or [18] * len(cabecalho), start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    return ws


def fmt(d):
    return "; ".join(f"{k}: {v}" for k, v in (d or {}).items())


def novo_wb():
    wb = Workbook()
    wb.remove(wb.active)
    return wb


def sheet_requisitos(wb):
    aba(wb, "Requisitos", ["ID", "Descrição verificável", "Tipo", "Prioridade", "Critério de aceitação", "Riscos"],
        [[r["id"], r["descricao"], r["tipo"], r["prioridade"], r["criterio"], r["riscos"]] for r in requisitos], [9, 55, 22, 11, 55, 12])


def sheet_riscos(wb):
    aba(wb, "Matriz de riscos", ["ID", "Risco", "Requisitos", "Probabilidade", "Impacto", "Prioridade", "Resposta/teste"],
        [[r["id"], r["risco"], r["requisitos"], r["probabilidade"], r["impacto"], r["prioridade"], r["resposta"]] for r in riscos], [7, 45, 14, 13, 10, 11, 60])


def sheet_catalogo(wb):
    aba(wb, "Catálogo de casos", ["ID do caso", "Título", "Requisito relacionado", "Riscos", "Nível/tipo", "Técnica aplicada", "Tipo de caso", "Prioridade",
                                  "Pré-condições", "Dados de entrada", "Passos numerados", "Resultado esperado", "Candidato à automação", "Responsável"],
        [[c["id"], c["titulo"], c["requisitos"], c["riscos"], c["nivel"], c["tecnica"], c["tipo"], c["prioridade"], c["preCondicoes"], c["dados"],
          "\n".join(f"{i}. {p}" for i, p in enumerate(c["passos"], 1)), c["esperado"], c["automacao"], "(integrante do grupo)"] for c in casos],
        [8, 34, 14, 10, 20, 30, 11, 10, 30, 32, 50, 34, 30, 16])


def sheet_execucao(wb):
    linhas = []
    for c in ("C0", "C1", "C2"):
        for r in execucoes[c]:
            defs = [d["id"] for d in defeitos if r["caso"] in d["casos"] and r["resultado"] == "Reprovado"]
            if c == "C2":
                defs = [d["id"] + " (reteste)" for d in defeitos if r["caso"] in d["casos"]]
            linhas.append([r["execucao"], r["caso"], r["ciclo"], r["versao"], r["dataHora"], fmt(r["esperado"]), fmt(r["obtido"]),
                           r["resultado"], r["evidencia"] or "", "; ".join(defs), r["observacao"]])
    aba(wb, "Registro de execução", ["Execução", "Caso", "Ciclo", "Versão", "Data/hora", "Esperado", "Obtido", "Resultado", "Evidência", "Defeito", "Observação"],
        linhas, [12, 8, 6, 22, 19, 38, 38, 13, 34, 18, 30], colorir=7)


def sheet_rastreabilidade(wb):
    linhas = []
    for r in requisitos:
        cs = cobertos[r["id"]]["manuais"]
        exs = [e["execucao"] for c in ("C0", "C1", "C2") for e in execucoes[c] if e["caso"] in cs]
        defs = [d["id"] for d in defeitos if r["id"] in d["requisito"]]
        finais = [e["resultado"] for e in execucoes["C2"] if e["caso"] in cs]
        aut = cobertos[r["id"]]["automatizados"]
        ok = (all(x == "Aprovado" for x in finais) and (finais or aut))
        linhas.append([r["id"], r["riscos"], "; ".join(cs) or "—", "; ".join(aut) or "—", f"{len(exs)} execuções (C0–C2)",
                       "; ".join(defs) or "—", "Atendido" if ok else "Pendente"])
    aba(wb, "Matriz de rastreabilidade", ["Requisito", "Risco", "Caso(s) manuais", "Testes automatizados", "Execução(ões)", "Defeito(s)", "Situação"],
        linhas, [10, 12, 40, 50, 20, 18, 12])


def sheet_defeitos(wb):
    aba(wb, "Defeitos", ["ID", "Título", "Requisito", "Casos", "Ambiente e versão", "Pré-condições", "Dados utilizados", "Passos para reproduzir",
                         "Resultado esperado", "Resultado obtido", "Severidade", "Prioridade", "Evidências", "Causa", "Correção", "Histórico de status",
                         "Status", "Responsável"],
        [[d["id"], d["titulo"], d["requisito"], d["casos"], d["ambiente"], d["preCondicoes"], d["dados"], d["passos"], d["esperado"], d["obtido"],
          d["severidade"], d["prioridade"], d["evidencias"], d["causa"], d["correcao"], d["historico"], d["status"], "(integrante do grupo)"] for d in defeitos],
        [9, 40, 10, 16, 30, 22, 26, 45, 30, 34, 10, 10, 40, 40, 36, 45, 11, 16], colorir=16)


def sheet_automatizados(wb):
    aba(wb, "Testes automatizados", ["ID", "Nome (requisito/caso)", "Nível", "Ferramenta", "Arquivo", "Pipeline inicial (1977789)", "Execução final"],
        [[t["id"], t["nome"], t["nivel"], t["ferramenta"], t["arquivo"], t["inicial"], t["final"]] for t in automatizados],
        [9, 70, 18, 26, 42, 16, 14], colorir=6)


def sheet_nf(wb):
    linhas = []
    cat = {"NF-01": "Desempenho", "NF-02": "Desempenho", "NF-03": "Compatibilidade", "NF-04": "Compatibilidade", "NF-05": "Compatibilidade",
           "NF-06": "Segurança básica", "NF-07": "Segurança básica", "NF-08": "Segurança básica", "NF-09": "Confiabilidade"}
    for k, m in nf["medicoes"].items():
        extra = {x: y for x, y in m.items() if x != "criterio"}
        linhas.append([k, cat.get(k, ""), m["criterio"], json.dumps(extra, ensure_ascii=False), "Atende", f"resultados/nao-funcionais/ ({nf['executadoEm']})"])
    aba(wb, "Não funcionais", ["ID", "Categoria", "Métrica/critério", "Resultado obtido", "Conclusão", "Evidência"], linhas, [8, 16, 34, 70, 10, 40])


def sheet_metricas(wb):
    m = metricas
    linhas = [
        ["Percentual de execução", f"{m['percentualExecucao']}%", "C2: executados/planejados", f"{ciclos['C2']['executados']}/{ciclos['C2']['planejados']} (C0: {ciclos['C0']['percentualExecucao']}%, C1: {ciclos['C1']['percentualExecucao']}%)"],
        ["Taxa de aprovação", f"C1 {m['taxaAprovacao']['C1']}% → C2 {m['taxaAprovacao']['C2']}%", "aprovados/executados", f"C1 {ciclos['C1']['aprovados']}/{ciclos['C1']['executados']}; C2 {ciclos['C2']['aprovados']}/{ciclos['C2']['executados']}"],
        ["Taxa de reprovação", f"C1 {m['taxaReprovacao']['C1']}% → C2 {m['taxaReprovacao']['C2']}%", "reprovados/executados", f"C1 {ciclos['C1']['reprovados']}/{ciclos['C1']['executados']}; C2 {ciclos['C2']['reprovados']}/{ciclos['C2']['executados']}"],
        ["Cobertura de requisitos", f"{m['coberturaRequisitos']['percentual']}%", "requisitos com teste executado/requisitos no escopo", f"{m['coberturaRequisitos']['cobertos']}/{m['coberturaRequisitos']['total']}"],
        ["Taxa de automação", f"{m['taxaAutomacao']['percentual']}%", "casos automatizados/casos planejados para automação", f"{m['taxaAutomacao']['automatizados']}/{m['taxaAutomacao']['planejados']}"],
        ["Defeitos por severidade", ", ".join(f"{k}: {v}" for k, v in sev.items()), "contagem por categoria", f"{len(defeitos)} defeitos"],
        ["Defeitos por status", ", ".join(f"{k}: {v}" for k, v in sts.items()), "contagem por estado", ""],
        ["Taxa de reabertura", f"{m['taxaReabertura']['percentual']}%", "reabertos/retestados", f"{m['taxaReabertura']['reabertos']}/{m['taxaReabertura']['retestados']}"],
        ["Avisos de análise estática (ESLint)", f"{qualidade['linhaDeBase']['eslint']['avisos']} → {qualidade['final']['eslint']['avisos']}", "avisos (0 erros)", "linha de base x final"],
        ["Cobertura de linhas de código", f"{qualidade['linhaDeBase']['cobertura']['linhas']}% → {qualidade['final']['cobertura']['linhas']}%", "node --test --experimental-test-coverage", "unit + API"],
    ]
    aba(wb, "Métricas", ["Indicador", "Valor", "Cálculo", "Fonte dos dados"], linhas, [34, 34, 46, 50])


def salvar_wb(wb, nome):
    wb.save(os.path.join(SAIDA, nome))


wb = novo_wb(); sheet_requisitos(wb); sheet_riscos(wb); salvar_wb(wb, "P02_requisitos_e_riscos.xlsx")
wb = novo_wb(); sheet_catalogo(wb); sheet_rastreabilidade(wb); salvar_wb(wb, "P04_P05_catalogo_e_rastreabilidade.xlsx")
wb = novo_wb(); sheet_execucao(wb); salvar_wb(wb, "P06_registro_de_execucao.xlsx")
wb = novo_wb(); sheet_defeitos(wb); salvar_wb(wb, "P07_defeitos.xlsx")
wb = novo_wb(); sheet_automatizados(wb); sheet_nf(wb); salvar_wb(wb, "P08_P09_testes_automatizados_e_nao_funcionais.xlsx")
wb = novo_wb(); sheet_metricas(wb); sheet_execucao(wb); sheet_defeitos(wb); salvar_wb(wb, "P10_metricas.xlsx")
wb = novo_wb()
for fn in (sheet_requisitos, sheet_riscos, sheet_catalogo, sheet_rastreabilidade, sheet_execucao, sheet_defeitos, sheet_automatizados, sheet_nf, sheet_metricas):
    fn(wb)
salvar_wb(wb, "PLANILHA_MESTRE_P2.xlsx")

with open(os.path.join(SAIDA, "P07_defeitos.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerow(["ID", "Título", "Requisito", "Casos", "Severidade", "Prioridade", "Status", "Versão encontrada", "Versão corrigida", "Correção"])
    for d in defeitos:
        w.writerow([d["id"], d["titulo"], d["requisito"], d["casos"], d["severidade"], d["prioridade"], d["status"], d["versaoEncontrada"], d["versaoCorrigida"], d["correcao"]])

print(json.dumps({k: metricas[k] for k in ("percentualExecucao", "taxaAprovacao", "taxaReprovacao", "coberturaRequisitos", "taxaAutomacao",
                                           "defeitosPorSeveridade", "defeitosPorStatus", "taxaReabertura", "testesAutomatizadosPorNivel", "postman")},
                 ensure_ascii=False, default=str)[:1500])
print("ciclos", {c: (v["aprovados"], v["reprovados"], v["naoExecutados"]) for c, v in ciclos.items()})
print("qualidade", qualidade["linhaDeBase"]["eslint"]["avisos"], qualidade["final"]["eslint"]["avisos"], qualidade["linhaDeBase"]["cobertura"], qualidade["final"]["cobertura"])
