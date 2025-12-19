from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from datetime import date, datetime
from typing import Optional
import os

from app.models.applicant import Applicant, PositionType
from app.models.job_posting import JobPosting
from app.models.company import Company


class DocumentGenerator:
    """Service zur Generierung von PDF-Dokumenten für die Bundesagentur für Arbeit"""
    
    POSITION_TYPE_LABELS = {
        PositionType.STUDENTENFERIENJOB: "Studentenferienjob / Ferienbeschäftigung",
        PositionType.SAISONJOB: "Saisonarbeit",
        PositionType.FACHKRAFT: "Fachkräftebeschäftigung",
        PositionType.AUSBILDUNG: "Ausbildung"
    }
    
    @staticmethod
    def generate_arbeitserlaubnis_antrag(
        applicant: Applicant,
        job_posting: Optional[JobPosting] = None,
        company: Optional[Company] = None
    ) -> BytesIO:
        """
        Generiert einen Antrag auf Arbeitserlaubnis basierend auf den Bewerberdaten.
        Entspricht dem Formular der Bundesagentur für Arbeit.
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=14,
            spaceAfter=20,
            alignment=1  # Center
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=11,
            spaceAfter=10,
            spaceBefore=15,
            textColor=colors.darkblue
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5
        )
        
        small_style = ParagraphStyle(
            'SmallText',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey
        )
        
        elements = []
        
        # Titel
        elements.append(Paragraph(
            "Antrag auf Zustimmung zur Beschäftigung<br/>gemäß § 39 AufenthG",
            title_style
        ))
        elements.append(Paragraph(
            f"Erstellt am: {datetime.now().strftime('%d.%m.%Y')}",
            small_style
        ))
        elements.append(Spacer(1, 0.5*cm))
        
        # Abschnitt 1: Angaben zur Person
        elements.append(Paragraph("1. Angaben zur Person des Arbeitnehmers", header_style))
        
        person_data = [
            ["Familienname:", applicant.last_name or ""],
            ["Vorname:", applicant.first_name or ""],
            ["Geburtsdatum:", applicant.date_of_birth.strftime('%d.%m.%Y') if applicant.date_of_birth else ""],
            ["Staatsangehörigkeit:", applicant.nationality or ""],
            ["Telefon:", applicant.phone or ""],
        ]
        
        person_table = Table(person_data, colWidths=[5*cm, 10*cm])
        person_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(person_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Abschnitt 2: Adresse
        elements.append(Paragraph("2. Anschrift im Heimatland", header_style))
        
        address = []
        if applicant.street and applicant.house_number:
            address.append(f"{applicant.street} {applicant.house_number}")
        if applicant.postal_code and applicant.city:
            address.append(f"{applicant.postal_code} {applicant.city}")
        if applicant.country:
            address.append(applicant.country)
        
        address_data = [
            ["Adresse:", "\n".join(address) if address else "Nicht angegeben"],
        ]
        
        address_table = Table(address_data, colWidths=[5*cm, 10*cm])
        address_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(address_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Abschnitt 3: Art der Beschäftigung
        elements.append(Paragraph("3. Art der beantragten Beschäftigung", header_style))
        
        position_label = DocumentGenerator.POSITION_TYPE_LABELS.get(
            applicant.position_type,
            "Nicht angegeben"
        )
        
        job_data = [
            ["Art der Beschäftigung:", position_label],
        ]
        
        if job_posting:
            job_data.extend([
                ["Stellenbezeichnung:", job_posting.title or ""],
                ["Arbeitsort:", job_posting.location or ""],
                ["Beginn:", job_posting.start_date.strftime('%d.%m.%Y') if job_posting.start_date else ""],
                ["Ende:", job_posting.end_date.strftime('%d.%m.%Y') if job_posting.end_date else "Unbefristet"],
            ])
            
            if job_posting.salary_min and job_posting.salary_max:
                salary_type_label = {
                    'hourly': 'pro Stunde',
                    'monthly': 'pro Monat',
                    'yearly': 'pro Jahr'
                }.get(job_posting.salary_type, '')
                job_data.append([
                    "Vergütung:",
                    f"{job_posting.salary_min}€ - {job_posting.salary_max}€ {salary_type_label}"
                ])
        
        job_table = Table(job_data, colWidths=[5*cm, 10*cm])
        job_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(job_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Abschnitt 4: Angaben zum Arbeitgeber
        if company:
            elements.append(Paragraph("4. Angaben zum Arbeitgeber", header_style))
            
            company_address = []
            if company.street and company.house_number:
                company_address.append(f"{company.street} {company.house_number}")
            if company.postal_code and company.city:
                company_address.append(f"{company.postal_code} {company.city}")
            
            company_data = [
                ["Firmenname:", company.company_name or ""],
                ["Ansprechpartner:", company.contact_person or ""],
                ["Adresse:", "\n".join(company_address) if company_address else ""],
                ["Telefon:", company.phone or ""],
                ["Website:", company.website or ""],
                ["Branche:", company.industry or ""],
            ]
            
            company_table = Table(company_data, colWidths=[5*cm, 10*cm])
            company_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(company_table)
            elements.append(Spacer(1, 0.3*cm))
        
        # Abschnitt 5: Qualifikationen
        elements.append(Paragraph("5. Qualifikationen und Erfahrungen", header_style))
        
        qual_data = []
        if applicant.education:
            qual_data.append(["Ausbildung:", applicant.education])
        if applicant.work_experience:
            qual_data.append(["Berufserfahrung:", applicant.work_experience])
        if applicant.skills:
            skills_str = ", ".join(applicant.skills) if isinstance(applicant.skills, list) else str(applicant.skills)
            qual_data.append(["Fähigkeiten:", skills_str])
        if applicant.languages:
            if isinstance(applicant.languages, list):
                lang_str = ", ".join([
                    f"{l.get('language', '')} ({l.get('level', '')})" 
                    for l in applicant.languages if isinstance(l, dict)
                ])
            else:
                lang_str = str(applicant.languages)
            qual_data.append(["Sprachen:", lang_str])
        
        if qual_data:
            qual_table = Table(qual_data, colWidths=[5*cm, 10*cm])
            qual_table.setStyle(TableStyle([
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(qual_table)
        else:
            elements.append(Paragraph("Keine Qualifikationen angegeben", normal_style))
        
        elements.append(Spacer(1, 1*cm))
        
        # Unterschrift
        elements.append(Paragraph("6. Unterschrift", header_style))
        elements.append(Spacer(1, 0.5*cm))
        
        sig_data = [
            ["Ort, Datum:", "_" * 40],
            ["", ""],
            ["Unterschrift Arbeitnehmer:", "_" * 40],
            ["", ""],
            ["Unterschrift Arbeitgeber:", "_" * 40],
        ]
        
        sig_table = Table(sig_data, colWidths=[5*cm, 10*cm])
        sig_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ]))
        elements.append(sig_table)
        
        # Footer
        elements.append(Spacer(1, 1*cm))
        elements.append(Paragraph(
            "Dieses Dokument wurde automatisch vom IJP Portal generiert und dient als Vorlage. "
            "Bitte prüfen Sie alle Angaben auf Richtigkeit.",
            small_style
        ))
        
        # PDF generieren
        doc.build(elements)
        buffer.seek(0)
        return buffer
    
    @staticmethod
    def generate_lebenslauf(applicant: Applicant) -> BytesIO:
        """Generiert einen einfachen Lebenslauf als PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )
        
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1
        )
        
        header_style = ParagraphStyle(
            'Header',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=10,
            spaceBefore=20,
            textColor=colors.darkblue,
            borderWidth=1,
            borderColor=colors.darkblue,
            borderPadding=5
        )
        
        normal_style = ParagraphStyle(
            'Normal',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5
        )
        
        elements = []
        
        # Titel
        elements.append(Paragraph("LEBENSLAUF", title_style))
        
        # Persönliche Daten
        elements.append(Paragraph("Persönliche Daten", header_style))
        
        personal_info = f"""
        <b>Name:</b> {applicant.first_name} {applicant.last_name}<br/>
        <b>Geburtsdatum:</b> {applicant.date_of_birth.strftime('%d.%m.%Y') if applicant.date_of_birth else 'Nicht angegeben'}<br/>
        <b>Nationalität:</b> {applicant.nationality or 'Nicht angegeben'}<br/>
        <b>Telefon:</b> {applicant.phone or 'Nicht angegeben'}<br/>
        """
        
        if applicant.street:
            personal_info += f"<b>Adresse:</b> {applicant.street} {applicant.house_number or ''}, "
            personal_info += f"{applicant.postal_code or ''} {applicant.city or ''}, {applicant.country or ''}"
        
        elements.append(Paragraph(personal_info, normal_style))
        
        # Ausbildung
        if applicant.education:
            elements.append(Paragraph("Ausbildung", header_style))
            elements.append(Paragraph(applicant.education, normal_style))
        
        # Berufserfahrung
        if applicant.work_experience:
            elements.append(Paragraph("Berufserfahrung", header_style))
            elements.append(Paragraph(applicant.work_experience, normal_style))
        
        # Fähigkeiten
        if applicant.skills:
            elements.append(Paragraph("Fähigkeiten", header_style))
            skills_str = ", ".join(applicant.skills) if isinstance(applicant.skills, list) else str(applicant.skills)
            elements.append(Paragraph(skills_str, normal_style))
        
        # Sprachen
        if applicant.languages:
            elements.append(Paragraph("Sprachen", header_style))
            if isinstance(applicant.languages, list):
                for lang in applicant.languages:
                    if isinstance(lang, dict):
                        elements.append(Paragraph(
                            f"• {lang.get('language', '')} - {lang.get('level', '')}",
                            normal_style
                        ))
        
        # PDF generieren
        doc.build(elements)
        buffer.seek(0)
        return buffer
