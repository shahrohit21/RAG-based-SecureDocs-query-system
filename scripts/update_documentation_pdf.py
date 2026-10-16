"""
Script to compile Project_Documentation.md into Project_Documentation.pdf.
Uses ReportLab with high-fidelity formatting.
"""

import os
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_pdf():
    md_path = os.path.join(os.path.dirname(__file__), "..", "Project_Documentation.md")
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "Project_Documentation.pdf")

    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found.")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        text = f.read()

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()

    h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=18, leading=22, textColor=colors.HexColor('#1E3A8A'), spaceAfter=8)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor('#0F172A'), spaceBefore=12, spaceAfter=6)
    p_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9, leading=13, textColor=colors.HexColor('#334155'), spaceAfter=5)
    bullet_style = ParagraphStyle('Bullet', parent=styles['Normal'], fontSize=8.5, leading=12, textColor=colors.HexColor('#1E293B'), leftIndent=12, spaceAfter=3)

    def fmt(s):
        s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        s = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', s)
        s = re.sub(r'`(.*?)`', r'<b>\1</b>', s)
        return s

    story = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
        elif line.startswith('# '):
            story.append(Paragraph(fmt(line[2:]), h1_style))
            story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=10))
        elif line.startswith('## '):
            story.append(Paragraph(fmt(line[3:]), h2_style))
        elif line.startswith('### '):
            story.append(Paragraph(fmt(line[4:]), h2_style))
        elif line.startswith('- ') or line.startswith('* '):
            story.append(Paragraph(f'&bull; {fmt(line[2:])}', bullet_style))
        elif len(line) > 2 and line[0].isdigit() and line[1:3] in ('. ', '):'):
            story.append(Paragraph(f'<b>{line[:2]}</b> {fmt(line[3:])}', bullet_style))
        else:
            story.append(Paragraph(fmt(line), p_style))

    doc.build(story)
    print(f"Successfully generated {pdf_path}")

if __name__ == "__main__":
    generate_pdf()
