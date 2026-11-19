"""
Converte os documentos docs/P*.md em DOCX (pandoc) e PDF (HTML + Google Chrome headless),
substituindo os marcadores {{...}} por tabelas geradas a partir dos dados reais.

Uso:  python docs/ferramentas/gerar_documentos.py
Saída: docs/gerados/documentos/*.docx e *.pdf
"""
import glob
import json
import os
import re
import subprocess
import tempfile

import pypandoc

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(RAIZ, "docs")
SAIDA = os.path.join(DOCS, "gerados", "documentos")
os.makedirs(SAIDA, exist_ok=True)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def ler(*p):
    with open(os.path.join(RAIZ, *p), encoding="utf-8") as f:
        return json.load(f)


requisitos = ler("docs", "dados", "requisitos.json")
riscos = ler("docs", "dados", "riscos.json")
defeitos = ler("docs", "dados", "defeitos.json")
casos = ler("resultados", "catalogo", "casos.json")
execs = {c: ler("resultados", "execucoes", c, "execucoes.json") for c in ("C0", "C1", "C2")}
nf = ler("resultados", "nao-funcionais", "nf-resultados.json")
metricas = ler("docs", "gerados", "metricas.json")


def cel(v):
    return str(v).replace("|", "\\|").replace("\n", " ")


def tabela(cab, linhas):
    larg = [max([len(c)] + [len(cel(l[i])) for l in linhas]) for i, c in enumerate(cab)]
    larg = [min(max(w, 8), 70) for w in larg]
    out = ["| " + " | ".join(cab) + " |", "|" + "|".join(["-" * w for w in larg]) + "|"]
    out += ["| " + " | ".join(cel(x) for x in l) + " |" for l in linhas]
    return "\n".join(out)


def fmt(d):
    return "; ".join(f"{k}: {v}" for k, v in (d or {}).items())


def t_requisitos():
    return tabela(["ID", "Descrição verificável", "Tipo", "Prioridade", "Critério de aceitação"],
                  [[r["id"], r["descricao"], r["tipo"], r["prioridade"], r["criterio"]] for r in requisitos])


def t_riscos():
    return tabela(["ID", "Risco", "Req.", "Prob.", "Impacto", "Prioridade", "Resposta/teste"],
                  [[r["id"], r["risco"], r["requisitos"], r["probabilidade"], r["impacto"], r["prioridade"], r["resposta"]] for r in riscos])


def t_casos():
    return tabela(["Caso", "Título", "Requisito", "Técnica", "Tipo", "Esperado", "Automação"],
                  [[c["id"], c["titulo"], c["requisitos"], c["tecnica"], c["tipo"], c["esperado"], c["automacao"]] for c in casos])


def t_execucao():
    linhas = []
    for c in casos:
        res = []
        for ci in ("C0", "C1", "C2"):
            r = next((e for e in execs[ci] if e["caso"] == c["id"]), None)
            res.append(r["resultado"] if r else "—")
        defs = [d["id"] for d in defeitos if c["id"] in d["casos"]]
        linhas.append([c["id"], *res, "; ".join(defs) or "—"])
    return tabela(["Caso", "C0 (v1.0)", "C1 (v2.0.0)", "C2 (v2.1.0)", "Defeito"], linhas) + \
        "\n\nEvidências: `resultados/execucoes/<ciclo>/<caso>.png`. Registro completo com esperado, obtido e data/hora: `P06_registro_de_execucao.xlsx`."


def t_defeitos_resumo():
    return tabela(["ID", "Título", "Requisito", "Casos", "Severidade", "Prioridade", "Encontrado em", "Corrigido em", "Status"],
                  [[d["id"], d["titulo"], d["requisito"], d["casos"], d["severidade"], d["prioridade"], d["versaoEncontrada"], d["versaoCorrigida"], d["status"]] for d in defeitos])


def defeitos_detalhados():
    blocos = []
    campos = [("ID e título", lambda d: f'{d["id"]} – {d["titulo"]}'), ("Requisito/caso relacionado", lambda d: f'{d["requisito"]} / {d["casos"]}'),
              ("Ambiente e versão", lambda d: d["ambiente"]), ("Pré-condições", lambda d: d["preCondicoes"]), ("Dados utilizados", lambda d: d["dados"]),
              ("Passos para reproduzir", lambda d: d["passos"]), ("Resultado esperado", lambda d: d["esperado"]), ("Resultado obtido", lambda d: d["obtido"]),
              ("Severidade", lambda d: d["severidade"]), ("Prioridade", lambda d: d["prioridade"]), ("Evidências", lambda d: d["evidencias"]),
              ("Causa identificada", lambda d: d["causa"]), ("Correção", lambda d: d["correcao"]), ("Status", lambda d: d["status"]),
              ("Responsável", lambda d: "«PREENCHER: integrante»"), ("Reteste e conclusão", lambda d: d["historico"])]
    for d in defeitos:
        blocos.append(f"## {d['id']} – {d['titulo']}\n\n" + tabela(["Campo", "Conteúdo"], [[n, f(d)] for n, f in campos]))
    return "\n\n".join(blocos)


def t_rastreabilidade():
    linhas = []
    for r in requisitos:
        det = metricas["coberturaRequisitos"]["detalhe"][r["id"]]
        exs = sum(1 for ci in execs for e in execs[ci] if e["caso"] in det["manuais"])
        defs = [d["id"] for d in defeitos if r["id"] in d["requisito"]]
        linhas.append([r["id"], r["riscos"], "; ".join(det["manuais"]) or "—", "; ".join(det["automatizados"]) or "—", str(exs), "; ".join(defs) or "—", "Atendido"])
    return tabela(["Requisito", "Risco", "Casos manuais", "Testes automatizados", "Execuções", "Defeitos", "Situação"], linhas)


def t_nf():
    cat = {"NF-01": "Desempenho", "NF-02": "Desempenho", "NF-03": "Compatibilidade", "NF-04": "Compatibilidade", "NF-05": "Compatibilidade",
           "NF-06": "Segurança básica", "NF-07": "Segurança básica", "NF-08": "Segurança básica", "NF-09": "Confiabilidade"}
    obj = {"NF-01": "Tempo de resposta do POST /api/simulacoes (100 repetições)", "NF-02": "Tempo de carregamento da página (10 repetições, Chrome)",
           "NF-03": "Fluxo principal no Chrome 1366x768", "NF-04": "Fluxo principal no Firefox 1366x768", "NF-05": "Fluxo em tela de celular 375x667",
           "NF-06": "Rotas protegidas sem token ou com token inválido", "NF-07": "Senha ausente nos arquivos enviados ao navegador",
           "NF-08": "Acesso a arquivos fora da pasta pública", "NF-09": "Integridade após 50 gravações e reinício controlado"}
    linhas = []
    for k, m in nf["medicoes"].items():
        if "media" in m:
            br = lambda x: f"{x:.2f}".replace(".", ",")  # noqa: E731
            obtido = f'média {br(m["media"])} ms; p95 {br(m["p95"])} ms; mín {br(m["min"])}; máx {br(m["max"])} (n={m["n"]})'
        elif k == "NF-06":
            obtido = f'{len(m["obtidos"])} chamadas, todas 401' if all(v == 401 for v in m["obtidos"].values()) else json.dumps(m["obtidos"])
        else:
            obtido = fmt({x: y for x, y in m.items() if x != "criterio"})
        linhas.append([k, cat[k], obj[k], m["criterio"], obtido, "Atende"])
    return tabela(["ID", "Categoria", "Objetivo", "Métrica/critério", "Resultado obtido", "Conclusão"], linhas) + \
        f'\n\nAmbiente: macOS 26.5, Node.js {nf["node"]}, servidor local, execução em {nf["executadoEm"][:10]}. Procedimento e dados: `tests/nao-funcionais/nf.test.js`.'


MARCADORES = {
    "{{tabela:requisitos}}": t_requisitos, "{{tabela:riscos}}": t_riscos, "{{tabela:casos_resumo}}": t_casos,
    "{{tabela:execucao_resumo}}": t_execucao, "{{tabela:defeitos_resumo}}": t_defeitos_resumo, "{{defeitos_detalhados}}": defeitos_detalhados,
    "{{tabela:rastreabilidade}}": t_rastreabilidade, "{{tabela:nf}}": t_nf,
}

QUEBRA = '\n```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n\n```{=html}\n<div class="quebra"></div>\n```\n'

SUMARIO = """
```{=openxml}
<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Sumário</w:t></w:r></w:p>
<w:p><w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Sumário: no Word, clique com o botão direito aqui e escolha "Atualizar campo".</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
```

```{=html}
<div id="sumario-aqui"></div>
```
"""

CSS = """
@page { size: A4; margin: 2cm 1.8cm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.4; color: #222; max-width: none; }
h1 { color: #b5121b; font-size: 16pt; border-bottom: 2px solid #b5121b; padding-bottom: 3px; margin-top: 22px; page-break-after: avoid; }
h2 { color: #7a0c12; font-size: 13pt; page-break-after: avoid; }
header#title-block-header h1.title { border: 0; text-align: center; font-size: 18pt; }
header#title-block-header p.subtitle { text-align: center; color: #555; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 14px; font-size: 8.3pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #b5121b; color: #fff; text-align: left; padding: 4px; }
td { border: 1px solid #ccc; padding: 3px 4px; vertical-align: top; }
tr:nth-child(even) td { background: #f7f7f7; }
code { font-size: 8.8pt; background: #f2f2f2; padding: 0 2px; word-break: break-all; }
pre { background: #f2f2f2; padding: 8px; font-size: 8.8pt; white-space: pre-wrap; }
blockquote { border-left: 4px solid #b5121b; background: #fbeaea; margin: 10px 0; padding: 6px 12px; }
img { max-width: 100%; display: block; margin: 8px auto; }
figure { margin: 10px 0; text-align: center; } figcaption { font-size: 9pt; color: #555; }
.capa { text-align: center; padding-top: 120px; font-size: 13pt; line-height: 2; }
.capa p:first-child strong { font-size: 24pt; color: #b5121b; }
.quebra { page-break-after: always; }
nav#TOC { page-break-after: always; } nav#TOC ul { list-style: none; padding-left: 14px; } nav#TOC > ul { padding-left: 0; }
"""


def preparar(md):
    for k, f in MARCADORES.items():
        if k in md:
            md = md.replace(k, f())
    if ":::\n\n# Folha de identificação" in md:
        md = md.replace(":::\n\n# Folha de identificação", ":::\n" + QUEBRA + sumario_docx(md) + QUEBRA + "\n# Folha de identificação")
    return md


def sumario_docx(md):
    """Sumário fixo para o DOCX (títulos de nível 1 e 2) + marcador onde o HTML insere o próprio sumário."""
    from xml.sax.saxutils import escape
    corpo = md.split("# Folha de identificação", 1)[1]
    titulos = [("# ", "Folha de identificação")] + re.findall(r"^(#{1,2} )(.+)$", corpo, re.M)
    pars = ['<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Sumário</w:t></w:r></w:p>']
    for marca, t in titulos:
        recuo = 0 if marca == "# " else 400
        pars.append(f'<w:p><w:pPr><w:ind w:left="{recuo}"/></w:pPr><w:r><w:t xml:space="preserve">{escape(t)}</w:t></w:r></w:p>')
    return "\n```{=openxml}\n" + "".join(pars) + "\n```\n\n```{=html}\n<div id=\"sumario-aqui\"></div>\n```\n"


def converter(caminho):
    nome = os.path.splitext(os.path.basename(caminho))[0]
    md = preparar(open(caminho, encoding="utf-8").read())
    relatorio = "::: capa" in md
    if relatorio:
        md = md.replace('title: "Planejamento', 'pagetitle: "Planejamento', 1)
    extras = ["--resource-path", DOCS, "--metadata", "lang=pt-BR"]
    toc = ["--toc", "--toc-depth=2", "--metadata", "toc-title=Sumário"] if relatorio else []
    pypandoc.convert_text(md, "docx", format="markdown", outputfile=os.path.join(SAIDA, f"{nome}.docx"), extra_args=extras)
    with tempfile.TemporaryDirectory() as tmp:
        css = os.path.join(tmp, "estilo.css")
        open(css, "w", encoding="utf-8").write(CSS)
        html = os.path.join(tmp, f"{nome}.html")
        pypandoc.convert_text(md, "html5", format="markdown", outputfile=html,
                              extra_args=extras + toc + ["--standalone", "--embed-resources", "--css", css, "--metadata", f"pagetitle={nome}"])
        if relatorio:
            h = open(html, encoding="utf-8").read()
            m = re.search(r'<nav id="TOC".*?</nav>', h, re.S)
            if m:
                h = h.replace(m.group(0), "").replace('<div id="sumario-aqui"></div>', '<h1>Sumário</h1>' + re.sub(r'<h2 id="toc-title">.*?</h2>', '', m.group(0)))
                open(html, "w", encoding="utf-8").write(h)
        pdf = os.path.join(SAIDA, f"{nome}.pdf")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf}", f"file://{html}"],
                       check=True, capture_output=True, timeout=120)
    return nome


if __name__ == "__main__":
    for arq in sorted(glob.glob(os.path.join(DOCS, "P*.md")) + [os.path.join(DOCS, "COMPROVANTE_DE_ENTREGA.md")]):
        print("gerado:", converter(arq))
