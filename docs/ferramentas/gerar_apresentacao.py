"""
Gera a apresentação final (P13) em PPTX (python-pptx) e PDF (HTML 16:9 + Chrome headless)
a partir do mesmo conteúdo. Uso: python docs/ferramentas/gerar_apresentacao.py
"""
import base64
import json
import os
import subprocess
import tempfile

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.util import Inches, Pt

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAIDA = os.path.join(RAIZ, "docs", "gerados", "documentos")
G = lambda n: os.path.join(RAIZ, "docs", "gerados", "graficos", n)  # noqa: E731
E = lambda c, n: os.path.join(RAIZ, "resultados", "execucoes", c, n)  # noqa: E731
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
m = json.load(open(os.path.join(RAIZ, "docs", "gerados", "metricas.json"), encoding="utf-8"))
VERM = RGBColor(0xB5, 0x12, 0x1B)


def br(x):
    """Número no padrão brasileiro (vírgula decimal, sem ',00' supérfluo)."""
    return f"{x:.2f}".replace(".", ",").replace(",00", "")

# Cada slide: título, tópicos, imagens opcionais [(caminho, legenda)], tabela opcional, nota do apresentador
SLIDES = [
    {"titulo": "Planejamento, execução e avaliação da qualidade do Simulador de Empréstimo",
     "topicos": ["Projeto Integrado P2 – Testes e Qualidade de Software", "UNISAGRADO – Ciência da Computação – 2026",
                 "Prof. Dr. Elvio Gilberto da Silva", "Jonathans David da Silva P Jr · Lucas Soares de Almeida", "Pedro Henrique Teixeira Moroni · Guilherme de Oliveira Lazari"], "capa": True},
    {"titulo": "1. Sistema e objetivo",
     "topicos": ["Simula concessão de empréstimo: idade (18–60), renda ≥ 5x o valor, conta ativa",
                 "v1.0: página única, sem servidor → v2.1.0: interface + API REST + persistência em JSON",
                 "Objetivo: demonstrar com evidências se os requisitos são atendidos e quais riscos permanecem",
                 "Arquitetura: navegador ⇄ API (token) ⇄ regras + autenticação + repositório ⇄ arquivo"]},
    {"titulo": "2. Escopo",
     "topicos": ["15 requisitos: 11 funcionais (RF-01 a RF-11) e 4 não funcionais (RNF-01 a RNF-04)",
                 "6 fluxos: login, simular, histórico, excluir, finalizar, sair – 2 formulários",
                 "Fora do escopo: carga/estresse, multiusuário, HTTPS, Safari/Edge, acessibilidade completa"]},
    {"titulo": "3. Principais riscos",
     "tabela": [["Risco", "Prob.", "Impacto", "Prioridade"],
                ["R-02 Limites de idade 18/60", "Alta", "Alto", "Alta"],
                ["R-07 Dados vazios/negativos aceitos", "Alta", "Médio", "Alta"],
                ["R-05 Combinação das regras", "Média", "Alto", "Alta"],
                ["R-10 Acesso sem login / sessão após sair", "Média", "Alto", "Alta"],
                ["R-06 Transições de estado inválidas", "Média", "Médio", "Média"]],
     "topicos": ["12 riscos documentados; os de prioridade Alta executados primeiro e repetidos na regressão"]},
    {"titulo": "4. Estratégia de teste",
     "tabela": [["Nível", "Ferramenta", "Qtde."], ["Unitário", "node:test", "18"], ["Integração/API", "node:test + Postman/Newman", "12 + 12 req."],
                ["Sistema/interface", "Selenium WebDriver", "9"], ["Manual (sistema)", "Navegador + executor assistido", "34 casos / 96 execuções"],
                ["Não funcional", "node:test + Selenium", "9 (4 categorias)"], ["Aceitação", "Representante do usuário", "4 cenários"]],
     "topicos": ["Técnicas: partição, valor limite, tabela de decisão, estados, casos de uso, exceção, exploratório"]},
    {"titulo": "5. Caso manual e evidência – CT-08 (idade 18, valor limite)",
     "imagens": [(E("C1", "CT-08.png"), "C1 – v2.0.0: NEGADO (Reprovado)"), (E("C2", "CT-08.png"), "C2 – v2.1.0: APROVADO")],
     "topicos": ["Esperado: APROVADO (faixa 18–60 inclusiva) – obtido em C1: NEGADO → BUG-001"]},
    {"titulo": "6. Defeitos registrados (5 – todos encerrados)",
     "tabela": [["ID", "Defeito", "Sev.", "Técnica que encontrou"],
                ["BUG-001", "Idades 18 e 60 negadas (inserido intencionalmente na v1.0)", "Alta", "Valor limite"],
                ["BUG-002", "Campo vazio vira zero → NEGADO", "Média", "Exceção"],
                ["BUG-003", "Finalizar sem simular / simular após Finalizado", "Média", "Estados"],
                ["BUG-004", "v1.0 usável sem login (DevTools)", "Alta", "Segurança básica"],
                ["BUG-005", "Negativos sem \"Dados inválidos.\" (validação nativa)", "Baixa", "Partição inválida"]],
     "topicos": ["Reteste + regressão completa no ciclo C2: 34/34 aprovados, 0 reaberturas"]},
    {"titulo": "7. Automação em vários níveis – demonstração",
     "imagens": [(G("fig3_automatizados_por_nivel.png"), "")],
     "topicos": ["npm run test:unit · npm run test:postman · npm run test:e2e", "Nome do teste traz requisito e caso: UT-03 [RF-02/CT-08]"]},
    {"titulo": "8. Integração e sistema",
     "topicos": ["API: login, criar, listar, excluir, logout – fluxo positivo e negativo por operação",
                 "Postman: variáveis de ambiente, encadeamento (token, simId), contrato e tempo < 500 ms – 24 asserções",
                 "Selenium: 9 fluxos ponta a ponta, esperas explícitas, captura de tela em falha",
                 "Servidor real em porta livre + arquivo de dados temporário em cada teste"]},
    {"titulo": "9. Aceitação e não funcionais",
     "tabela": [["Categoria", "Resultado"], ["Desempenho", f'p95 POST = {br(m["naoFuncionais"]["NF-01"]["p95"])} ms (critério < 500 ms)'],
                ["Compatibilidade", "Chrome 157, Firefox 160 e tela 375x667 – OK"], ["Segurança básica", "8 chamadas sem token → 401; senha fora do cliente"],
                ["Confiabilidade", "50 registros íntegros após reinício"], ["Aceitação (AC-01 a 04)", "«PREENCHER: decisão do representante»"]]},
    {"titulo": "10. Métricas",
     "imagens": [(G("fig1_execucao_por_ciclo.png"), "")],
     "topicos": [f'Execução 100% · Aprovação C1 {br(m["taxaAprovacao"]["C1"])}% → C2 {br(m["taxaAprovacao"]["C2"])}% · Cobertura de requisitos {br(m["coberturaRequisitos"]["percentual"])}%',
                 f'Automação {br(m["taxaAutomacao"]["percentual"])}% · Reabertura {br(m["taxaReabertura"]["percentual"])}% · Defeitos: Alta 2, Média 2, Baixa 1']},
    {"titulo": "11. TDD – RF-11: informar os motivos da negação",
     "tabela": [["Etapa", "Commit", "Resultado"], ["RED", "a44e590", "5 testes novos falhando (motivos = undefined)"],
                ["GREEN", "263e841", "Implementação mínima – tudo verde"], ["REFACTOR", "ab1b0f7", "Constantes + tabela de regras + rotas em mapa – tudo verde"]],
     "topicos": ["Demonstração: git checkout a44e590 && npm run test:unit → git checkout main"]},
    {"titulo": "12. Pipeline CI e análise de qualidade",
     "imagens": [(G("fig4_qualidade.png"), "")],
     "topicos": ["GitHub Actions: push/PR → npm ci → ESLint → unit → API → Postman → Selenium → cobertura → artefatos",
                 "GitHub: falha controlada no ramo demo-pipeline-falha (REPROVADO) → main b34cd5a (APROVADO)", "github.com/tathans-js/simulador-emprestimo"]},
    {"titulo": "13. Conclusão e melhorias",
     "topicos": ["v1.0 não estava apta; v2.1.0 atende aos 15 requisitos no escopo (34/34 manuais, 60/60 automatizados)",
                 "Testar só o caminho feliz (30 anos) não teria encontrado nenhum dos defeitos",
                 "Melhorias: validar domínio da conta e idade inteira; evitar duplo envio; expiração de sessão; SonarCloud; aceitação externa"]},
]


def gerar_pptx():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    branco = prs.slide_layouts[6]
    for i, s in enumerate(SLIDES, 1):
        sl = prs.slides.add_slide(branco)
        faixa = sl.shapes.add_shape(1, 0, 0, prs.slide_width, Inches(0.18))
        faixa.fill.solid(); faixa.fill.fore_color.rgb = VERM; faixa.line.fill.background()
        if s.get("capa"):
            tb = sl.shapes.add_textbox(Inches(0.8), Inches(2.0), Inches(11.7), Inches(2))
            tb.text_frame.word_wrap = True
            p = tb.text_frame.paragraphs[0]; p.text = s["titulo"]; p.font.size = Pt(36); p.font.bold = True; p.font.color.rgb = VERM
            for t in s["topicos"]:
                q = tb.text_frame.add_paragraph(); q.text = t; q.font.size = Pt(20); q.space_before = Pt(10)
            continue
        tb = sl.shapes.add_textbox(Inches(0.6), Inches(0.35), Inches(12), Inches(0.9))
        p = tb.text_frame.paragraphs[0]; p.text = s["titulo"]; p.font.size = Pt(28); p.font.bold = True; p.font.color.rgb = VERM
        topo = Inches(1.35)
        if s.get("tabela"):
            linhas = s["tabela"]
            alt = Inches(0.42) * len(linhas)
            tab = sl.shapes.add_table(len(linhas), len(linhas[0]), Inches(0.6), topo, Inches(12.1), alt).table
            for r, linha in enumerate(linhas):
                for c, v in enumerate(linha):
                    cell = tab.cell(r, c); cell.text = v
                    for par in cell.text_frame.paragraphs:
                        par.font.size = Pt(15 if r else 16); par.font.bold = r == 0
            topo += alt + Inches(0.3)
        if s.get("imagens"):
            n = len(s["imagens"])
            larg = Inches(12.1 / n - 0.2 * (n - 1))
            alt_max = Inches(4.4)
            for k, (img, leg) in enumerate(s["imagens"]):
                esq = Inches(0.6) + k * (larg + Inches(0.3))
                pic = sl.shapes.add_picture(img, esq, topo, width=larg)
                if pic.height > alt_max:
                    proporcao = alt_max / pic.height
                    pic.height = alt_max; pic.width = int(pic.width * proporcao)
                if leg:
                    lt = sl.shapes.add_textbox(esq, topo + pic.height, larg, Inches(0.4))
                    lt.text_frame.paragraphs[0].text = leg; lt.text_frame.paragraphs[0].font.size = Pt(13)
            topo += alt_max + Inches(0.45)
        if s.get("topicos"):
            tb = sl.shapes.add_textbox(Inches(0.6), topo, Inches(12.1), prs.slide_height - topo - Inches(0.4))
            tf = tb.text_frame; tf.word_wrap = True
            for j, t in enumerate(s["topicos"]):
                par = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
                par.text = "• " + t; par.font.size = Pt(18 if not s.get("imagens") and not s.get("tabela") else 15); par.space_after = Pt(8)
        rod = sl.shapes.add_textbox(Inches(0.6), Inches(7.0), Inches(12.1), Inches(0.3))
        rod.text_frame.paragraphs[0].text = f"Simulador de Empréstimo – P2 TQS 2026 · {i}/{len(SLIDES)}"
        rod.text_frame.paragraphs[0].font.size = Pt(10); rod.text_frame.paragraphs[0].font.color.rgb = RGBColor(0x77, 0x77, 0x77)
    prs.save(os.path.join(SAIDA, "P13_apresentacao_final.pptx"))


def img64(p):
    return "data:image/png;base64," + base64.b64encode(open(p, "rb").read()).decode()


def gerar_pdf():
    css = """@page{size:13.333in 7.5in;margin:0}body{margin:0;font-family:Arial,sans-serif}
    .s{width:13.333in;height:7.5in;box-sizing:border-box;padding:.45in .6in;position:relative;page-break-after:always;border-top:.18in solid #b5121b;overflow:hidden}
    h1{color:#b5121b;font-size:28pt;margin:0 0 .2in}.capa h1{font-size:36pt;margin-top:1.4in}.capa p{font-size:20pt;margin:.12in 0}
    li{font-size:16pt;margin-bottom:8px}table{border-collapse:collapse;width:100%;font-size:14pt;margin-bottom:.2in}
    th{background:#b5121b;color:#fff;text-align:left;padding:6px}td{border:1px solid #ccc;padding:6px}
    .imgs{display:flex;gap:.3in;justify-content:center}.imgs figure{margin:0;flex:1;text-align:center}.imgs img{max-height:4.2in;max-width:100%}
    figcaption{font-size:12pt}.rod{position:absolute;bottom:.2in;left:.6in;font-size:10pt;color:#777}"""
    partes = []
    for i, s in enumerate(SLIDES, 1):
        if s.get("capa"):
            partes.append(f'<div class="s capa"><h1>{s["titulo"]}</h1>' + "".join(f"<p>{t}</p>" for t in s["topicos"]) + "</div>")
            continue
        h = f'<div class="s"><h1>{s["titulo"]}</h1>'
        if s.get("tabela"):
            t = s["tabela"]
            h += "<table><tr>" + "".join(f"<th>{c}</th>" for c in t[0]) + "</tr>" + "".join("<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>" for l in t[1:]) + "</table>"
        if s.get("imagens"):
            h += '<div class="imgs">' + "".join(f'<figure><img src="{img64(p)}"><figcaption>{l}</figcaption></figure>' for p, l in s["imagens"]) + "</div>"
        if s.get("topicos"):
            h += "<ul>" + "".join(f"<li>{t}</li>" for t in s["topicos"]) + "</ul>"
        h += f'<div class="rod">Simulador de Empréstimo – P2 TQS 2026 · {i}/{len(SLIDES)}</div></div>'
        partes.append(h)
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, "apresentacao.html")
        open(html, "w", encoding="utf-8").write(f'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>{css}</style><body>{"".join(partes)}</body></html>')
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={os.path.join(SAIDA, 'P13_apresentacao_final.pdf')}", f"file://{html}"], check=True, capture_output=True, timeout=120)


if __name__ == "__main__":
    os.makedirs(SAIDA, exist_ok=True)
    gerar_pptx()
    gerar_pdf()
    print("apresentação gerada:", len(SLIDES), "slides")
