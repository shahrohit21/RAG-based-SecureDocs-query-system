import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

# python-docx imports for DOCX generation
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

def generate_chat_pdf(session_title: str, user_email: str, messages: list) -> io.BytesIO:
    """
    Generates a high-quality, professional PDF report of the chat conversation and Q&A summary.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=TA_LEFT,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=15
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=14,
        spaceAfter=6
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#475569')
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    q_style = ParagraphStyle(
        'QuestionStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#1E40AF')
    )

    a_style = ParagraphStyle(
        'AnswerStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )

    source_style = ParagraphStyle(
        'SourceStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#475569')
    )

    footer_style = ParagraphStyle(
        'FooterStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#94A3B8'),
        alignment=TA_CENTER
    )

    story = []

    # Title & Header
    story.append(Paragraph("SecureDoc-RAG • Chat Conversation Report", title_style))
    story.append(Paragraph("Enterprise Document Intelligence & Q&A Summary", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=14))

    # Calculate Summary Stats
    total_msgs = len(messages)
    conf_scores = [getattr(m, 'confidence_score', 0.0) or 0.0 for m in messages if getattr(m, 'confidence_score', None) is not None]
    avg_conf = (sum(conf_scores) / len(conf_scores)) if conf_scores else 0.0

    all_sources = set()
    for m in messages:
        chunks = getattr(m, 'source_chunks', None) or []
        for c in chunks:
            if isinstance(c, dict) and c.get('filename'):
                all_sources.add(c['filename'])

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Metadata Table
    meta_data = [
        [
            Paragraph("Conversation Thread:", meta_label_style),
            Paragraph(str(session_title or "Default Session"), meta_val_style),
            Paragraph("Generated At:", meta_label_style),
            Paragraph(now_str, meta_val_style)
        ],
        [
            Paragraph("Authorized User:", meta_label_style),
            Paragraph(str(user_email), meta_val_style),
            Paragraph("Total Q&A Pairs:", meta_label_style),
            Paragraph(str(total_msgs), meta_val_style)
        ],
        [
            Paragraph("Average Confidence:", meta_label_style),
            Paragraph(f"{(avg_conf * 100):.1f}%" if avg_conf > 0 else "N/A", meta_val_style),
            Paragraph("Referenced Files:", meta_label_style),
            Paragraph(f"{len(all_sources)} documents", meta_val_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[110, 155, 110, 155])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Q&A Breakdown Section
    story.append(Paragraph("Conversation Transcript & Citations", h2_style))

    if not messages:
        story.append(Paragraph("No conversation messages found in this session.", subtitle_style))
    else:
        for i, msg in enumerate(messages, 1):
            q_text = getattr(msg, 'question', '') or ''
            a_text = getattr(msg, 'answer', '') or ''
            conf = getattr(msg, 'confidence_score', 0.0) or 0.0
            created_at = getattr(msg, 'created_at', None)
            time_str = created_at.strftime("%H:%M:%S") if created_at else ""

            # Sources for this message
            msg_sources = []
            raw_sources = getattr(msg, 'source_chunks', None) or []
            if isinstance(raw_sources, list):
                for chunk in raw_sources:
                    if isinstance(chunk, dict) and chunk.get('filename'):
                        fn = chunk['filename']
                        sim = chunk.get('similarity_score')
                        if sim:
                            msg_sources.append(f"{fn} ({int(sim*100)}% match)")
                        else:
                            msg_sources.append(fn)

            sources_text = ", ".join(list(dict.fromkeys(msg_sources))) if msg_sources else "Document Repository"

            item_content = [
                [
                    Paragraph(f"<b>Q{i}:</b> {q_text}", q_style)
                ],
                [
                    Paragraph(f"<b>A:</b> {a_text}", a_style)
                ],
                [
                    Paragraph(f"<b>Confidence:</b> {(conf*100):.0f}% &nbsp;|&nbsp; <b>Sources:</b> {sources_text} &nbsp;|&nbsp; <b>Time:</b> {time_str}", source_style)
                ]
            ]

            qa_table = Table(item_content, colWidths=[530])
            qa_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EFF6FF')),
                ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
                ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.HexColor('#DBEAFE')),
                ('LINEBELOW', (0, 1), (-1, 1), 0.5, colors.HexColor('#E2E8F0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))

            story.append(qa_table)
            story.append(Spacer(1, 10))

    # Security & Compliance Footer
    story.append(Spacer(1, 15))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
    story.append(Paragraph(
        "CONFIDENTIAL & ENCRYPTED &bull; Generated by SecureDoc-RAG Engine &bull; Automated PII Masking & Tenant Isolation Applied",
        footer_style
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_chat_docx(session_title: str, user_email: str, messages: list) -> io.BytesIO:
    """
    Generates a structured, professional Microsoft Word (DOCX) report of the chat conversation.
    """
    doc = docx.Document()

    # Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Document Title
    title_p = doc.add_paragraph()
    title_run = title_p.add_run("SecureDoc-RAG • Chat Conversation Report")
    title_run.font.name = "Calibri"
    title_run.font.size = Pt(20)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 58, 138)  # #1E3A8A
    title_p.paragraph_format.space_after = Pt(2)

    subtitle_p = doc.add_paragraph()
    sub_run = subtitle_p.add_run("Enterprise Document Intelligence & Q&A Summary")
    sub_run.font.name = "Calibri"
    sub_run.font.size = Pt(11)
    sub_run.font.color.rgb = RGBColor(100, 116, 139)  # #64748B
    subtitle_p.paragraph_format.space_after = Pt(14)

    # Summary Stats
    total_msgs = len(messages)
    conf_scores = [getattr(m, 'confidence_score', 0.0) or 0.0 for m in messages if getattr(m, 'confidence_score', None) is not None]
    avg_conf = (sum(conf_scores) / len(conf_scores)) if conf_scores else 0.0
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    all_sources = set()
    for m in messages:
        chunks = getattr(m, 'source_chunks', None) or []
        for c in chunks:
            if isinstance(c, dict) and c.get('filename'):
                all_sources.add(c['filename'])

    # Metadata Table
    meta_table = doc.add_table(rows=3, cols=4)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER

    headers = [
        ("Conversation Thread:", str(session_title or "Default Session"), "Generated At:", now_str),
        ("Authorized User:", str(user_email), "Total Q&A Pairs:", str(total_msgs)),
        ("Avg Confidence:", f"{(avg_conf*100):.1f}%" if avg_conf > 0 else "N/A", "Referenced Files:", f"{len(all_sources)} documents")
    ]

    for row_idx, row_data in enumerate(headers):
        row = meta_table.rows[row_idx]
        for col_idx, text in enumerate(row_data):
            cell = row.cells[col_idx]
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(3)
            p.paragraph_format.space_after = Pt(3)
            run = p.add_run(text)
            run.font.name = "Calibri"
            run.font.size = Pt(9.5)
            if col_idx % 2 == 0:
                run.font.bold = True
                run.font.color.rgb = RGBColor(71, 85, 105)
            else:
                run.font.color.rgb = RGBColor(15, 23, 42)

    # Add space after table
    doc.add_paragraph().paragraph_format.space_before = Pt(12)

    # Heading
    h2 = doc.add_heading("Conversation Transcript & Citations", level=2)
    h2.paragraph_format.space_before = Pt(10)
    h2.paragraph_format.space_after = Pt(8)

    if not messages:
        doc.add_paragraph("No conversation messages found in this session.")
    else:
        for i, msg in enumerate(messages, 1):
            q_text = getattr(msg, 'question', '') or ''
            a_text = getattr(msg, 'answer', '') or ''
            conf = getattr(msg, 'confidence_score', 0.0) or 0.0

            # Sources
            msg_sources = []
            raw_sources = getattr(msg, 'source_chunks', None) or []
            if isinstance(raw_sources, list):
                for chunk in raw_sources:
                    if isinstance(chunk, dict) and chunk.get('filename'):
                        fn = chunk['filename']
                        sim = chunk.get('similarity_score')
                        if sim:
                            msg_sources.append(f"{fn} ({int(sim*100)}% match)")
                        else:
                            msg_sources.append(fn)

            sources_text = ", ".join(list(dict.fromkeys(msg_sources))) if msg_sources else "Document Repository"

            # Question Paragraph
            qp = doc.add_paragraph()
            qp.paragraph_format.space_before = Pt(8)
            qp.paragraph_format.space_after = Pt(2)
            q_label = qp.add_run(f"Q{i}: ")
            q_label.font.bold = True
            q_label.font.color.rgb = RGBColor(37, 99, 235)  # Blue
            q_run = qp.add_run(q_text)
            q_run.font.bold = True
            q_run.font.color.rgb = RGBColor(15, 23, 42)

            # Answer Paragraph
            ap = doc.add_paragraph()
            ap.paragraph_format.space_before = Pt(2)
            ap.paragraph_format.space_after = Pt(3)
            a_label = ap.add_run("Answer: ")
            a_label.font.bold = True
            a_label.font.color.rgb = RGBColor(30, 41, 59)
            a_run = ap.add_run(a_text)
            a_run.font.color.rgb = RGBColor(51, 65, 85)

            # Meta / Citation
            cp = doc.add_paragraph()
            cp.paragraph_format.space_before = Pt(1)
            cp.paragraph_format.space_after = Pt(8)
            c_run = cp.add_run(f"Confidence: {(conf*100):.0f}%  |  Sources: {sources_text}")
            c_run.font.italic = True
            c_run.font.size = Pt(8.5)
            c_run.font.color.rgb = RGBColor(100, 116, 139)

    # Footer note
    doc.add_paragraph().paragraph_format.space_before = Pt(16)
    fp = doc.add_paragraph()
    f_run = fp.add_run("CONFIDENTIAL & ENCRYPTED • Generated by SecureDoc-RAG • PII Sanitized & Multi-Tenant Isolated")
    f_run.font.italic = True
    f_run.font.size = Pt(8)
    f_run.font.color.rgb = RGBColor(148, 163, 184)
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
