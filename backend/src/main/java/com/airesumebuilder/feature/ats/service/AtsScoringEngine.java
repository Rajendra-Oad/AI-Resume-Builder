package com.airesumebuilder.feature.ats.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class AtsScoringEngine {
    private static final Set<String> STOP_WORDS = Set.of(
        "and", "the", "with", "for", "from", "that", "this", "you", "your", "our",
        "are", "will", "have", "has", "job", "role", "work", "years", "using"
    );

    public Score score(String resumeContent, String jobContent) {
        Set<String> keywords = keywords(jobContent);
        String normalizedResume = normalize(resumeContent);
        List<KeywordResult> results = keywords.stream()
            .map(keyword -> new KeywordResult(keyword, containsWord(normalizedResume, keyword)))
            .toList();
        long found = results.stream().filter(KeywordResult::found).count();
        BigDecimal score = keywords.isEmpty()
            ? BigDecimal.ZERO
            : BigDecimal.valueOf(found * 100.0 / keywords.size()).setScale(2, RoundingMode.HALF_UP);
        return new Score(score, results);
    }

    Set<String> keywords(String content) {
        LinkedHashSet<String> result = new LinkedHashSet<>();
        Arrays.stream(normalize(content).split("[^a-z0-9+#.]+"))
            .filter(word -> word.length() >= 3 && !STOP_WORDS.contains(word))
            .limit(30)
            .forEach(result::add);
        return result;
    }

    private boolean containsWord(String content, String word) {
        return Arrays.asList(content.split("[^a-z0-9+#.]+")).contains(word);
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    public record KeywordResult(String keyword, boolean found) {}
    public record Score(BigDecimal overallScore, List<KeywordResult> keywords) {}
}
