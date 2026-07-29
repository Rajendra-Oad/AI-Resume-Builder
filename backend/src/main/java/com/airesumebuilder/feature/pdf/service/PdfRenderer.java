package com.airesumebuilder.feature.pdf.service;

import com.airesumebuilder.feature.pdf.repository.PdfExportRepository.ResumeDocument;
import com.airesumebuilder.feature.template.engine.TemplateDefinition;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.util.Map;
import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.pdf.PdfWriter;
import org.openpdf.text.pdf.draw.LineSeparator;
import org.springframework.stereotype.Component;

@Component
public class PdfRenderer {
    public byte[] render(ResumeDocument resume) {
        try {
            TemplateDefinition template = TemplateDefinition.parse(new ObjectMapper(), resume.templateConfiguration());
            TemplateDefinition.Theme theme = template.theme();
            float margin = bounded(resume.pageMargin(), 24, 72, 42);
            float size = bounded(resume.fontSize() == null ? 10.5f : resume.fontSize().floatValue(), 9, 13, 10.5f);
            float lineSpacing = bounded(resume.lineSpacing() == null ? 1.25f : resume.lineSpacing().floatValue(), 1, 1.8f, 1.25f);
            float sectionSpacing = bounded(resume.sectionSpacing(), 6, 24, 12);
            String family = family(resume.fontFamily() == null ? theme.bodyFont() : resume.fontFamily());
            String headingFamily = family(theme.headingFont());
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A4, margin, margin, margin, margin);
            PdfWriter.getInstance(document, output);
            document.open();

            Paragraph name = paragraph(safe(resume.fullName()), font(headingFamily, size + 8, Font.BOLD, theme.primary()), 1.05f);
            name.setAlignment(Element.ALIGN_CENTER);
            name.setSpacingAfter(2);
            document.add(name);
            if (present(resume.targetJobTitle())) {
                Paragraph role = paragraph(safe(resume.targetJobTitle()), font(headingFamily, size + 1, Font.BOLD, theme.accent()), lineSpacing);
                role.setAlignment(Element.ALIGN_CENTER);
                role.setSpacingAfter(3);
                document.add(role);
            }
            String contact = contact(resume);
            if (present(contact)) {
                Paragraph details = paragraph(contact, font(family, Math.max(8.5f, size - 1), Font.NORMAL, theme.muted()), lineSpacing);
                details.setAlignment(Element.ALIGN_CENTER);
                details.setSpacingAfter(7);
                document.add(details);
            }
            LineSeparator rule = new LineSeparator(0.7f, 100, theme.border(), Element.ALIGN_CENTER, 0);
            document.add(new Chunk(rule));

            Map<String, SectionContent> sections = Map.of(
                "SUMMARY", new SectionContent("Career Objective", resume.summary()),
                "SKILL", new SectionContent("Skills", resume.skills()),
                "EXPERIENCE", new SectionContent("Experience", resume.experience()),
                "PROJECT", new SectionContent("Projects", resume.projects()),
                "CERTIFICATION", new SectionContent("Certifications", resume.certifications()),
                "EDUCATION", new SectionContent("Education", resume.education()),
                "LANGUAGES", new SectionContent("Languages", resume.languages())
            );
            for (String key : template.sectionOrder()) {
                SectionContent section = sections.get(key);
                if (section != null && template.supportedSections().contains(key)) {
                    section(document, section.heading(), section.content(), headingFamily, family, size,
                        lineSpacing, sectionSpacing, theme);
                }
            }

            document.close();
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("PDF generation failed.", exception);
        }
    }

    private void section(Document document, String heading, String content, String headingFamily, String bodyFamily,
                         float size, float lineSpacing, float spacing, TemplateDefinition.Theme theme) throws Exception {
        if (!present(content)) return;
        Paragraph title = paragraph(heading.toUpperCase(), font(headingFamily, size + 1, Font.BOLD, theme.accent()), 1);
        title.setSpacingBefore(spacing);
        title.setSpacingAfter(3);
        document.add(title);
        Paragraph body = paragraph(safe(content), font(bodyFamily, size, Font.NORMAL, theme.text()), lineSpacing);
        body.setSpacingAfter(0);
        document.add(body);
    }

    private Paragraph paragraph(String text, Font font, float multiplier) {
        Paragraph paragraph = new Paragraph(text, font);
        paragraph.setLeading(font.getSize() * multiplier);
        return paragraph;
    }

    private Font font(String family, float size, int style, Color color) { return FontFactory.getFont(family, size, style, color); }
    private String family(String value) { return switch (value == null ? "" : value) { case "TIMES" -> FontFactory.TIMES_ROMAN; case "COURIER" -> FontFactory.COURIER; default -> FontFactory.HELVETICA; }; }
    private String contact(ResumeDocument r) { return Stream.of(r.location(),r.contactEmail(),r.phone(),r.githubUrl(),r.linkedinUrl()).filter(this::present).map(this::safe).collect(Collectors.joining("  |  ")); }
    private boolean present(String value) { return value != null && !value.isBlank(); }
    private String safe(String value) { return value == null ? "" : value.replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", ""); }
    private float bounded(float value,float min,float max,float fallback){return Float.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
    private record SectionContent(String heading, String content) {}
}
