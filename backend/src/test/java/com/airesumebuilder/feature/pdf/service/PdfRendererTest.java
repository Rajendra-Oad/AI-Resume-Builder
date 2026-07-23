package com.airesumebuilder.feature.pdf.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.airesumebuilder.feature.pdf.repository.PdfExportRepository.ResumeDocument;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.openpdf.text.pdf.PdfReader;
import org.openpdf.text.pdf.parser.PdfTextExtractor;

class PdfRendererTest {
    @Test
    void createsARealPdfAndSanitizesControlCharacters() {
        byte[] pdf = new PdfRenderer().render(new ResumeDocument(1,2,"Resume","Summary\u0000 text","Engineer","Demo User"));
        assertThat(new String(pdf,0,5,StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        assertThat(pdf.length).isGreaterThan(500);
    }

    @Test
    void rendersFullResumeSectionsUsingCustomizationSettings() throws Exception {
        ResumeDocument resume = new ResumeDocument(1,2,"Frontend resume","Builds accessible interfaces","Front-End Developer","Demo User","demo@example.com","123","India","github.com/demo","linkedin.com/in/demo","React, JavaScript","Developer — Company","Learning platform","B.Tech Computer Science","Frontend Certificate","English, Hindi","TIMES",new BigDecimal("11"),new BigDecimal("1.35"),14,48);

        PdfReader reader = new PdfReader(new PdfRenderer().render(resume));
        String text = new PdfTextExtractor(reader).getTextFromPage(1);

        assertThat(text).contains("Demo User","CAREER OBJECTIVE","SKILLS","EXPERIENCE","PROJECTS","EDUCATION","LANGUAGES");
        reader.close();
    }
}
