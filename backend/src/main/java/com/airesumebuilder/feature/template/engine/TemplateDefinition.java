package com.airesumebuilder.feature.template.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.awt.Color;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Immutable, validated rendering contract shared by catalog and PDF rendering.
 * Unknown/missing configuration values intentionally fall back to an ATS-safe layout.
 */
public record TemplateDefinition(
    String key,
    int version,
    String layout,
    List<String> sectionOrder,
    Set<String> supportedSections,
    Set<String> sidebarSections,
    Theme theme
) {
    private static final List<String> DEFAULT_ORDER =
        List.of("SUMMARY", "SKILL", "EXPERIENCE", "PROJECT", "CERTIFICATION", "EDUCATION", "LANGUAGES");
    private static final Set<String> KNOWN = Set.copyOf(DEFAULT_ORDER);

    public static TemplateDefinition parse(ObjectMapper mapper, String json) {
        try {
            JsonNode root = json == null || json.isBlank() ? mapper.createObjectNode() : mapper.readTree(json);
            List<String> order = strings(root.path("sectionOrder")).stream().filter(KNOWN::contains).distinct().toList();
            Set<String> supported = Set.copyOf(strings(root.path("supportedSections")).stream().filter(KNOWN::contains).toList());
            JsonNode colors = root.path("theme");
            Theme theme = new Theme(
                color(colors.path("primary").asText(), "#17212b"),
                color(colors.path("accent").asText(), "#31546d"),
                color(colors.path("text").asText(), "#17212b"),
                color(colors.path("muted").asText(), "#52606d"),
                color(colors.path("border").asText(), "#9aa5b1"),
                font(colors.path("headingFont").asText()),
                font(colors.path("bodyFont").asText())
            );
            return new TemplateDefinition(
                root.path("key").asText("professional"),
                Math.max(1, root.path("version").asInt(1)),
                "sidebar".equals(root.path("layout").asText()) ? "sidebar" : "single",
                order.isEmpty() ? DEFAULT_ORDER : order,
                supported.isEmpty() ? KNOWN : supported,
                Set.copyOf(strings(root.path("sidebarSections"))),
                theme
            );
        } catch (Exception ignored) {
            return defaults();
        }
    }

    public static TemplateDefinition defaults() {
        return new TemplateDefinition("professional", 1, "single", DEFAULT_ORDER, KNOWN, Set.of(),
            new Theme(Color.decode("#17212b"), Color.decode("#31546d"), Color.decode("#17212b"),
                Color.decode("#52606d"), Color.decode("#9aa5b1"), "TIMES", "TIMES"));
    }

    private static List<String> strings(JsonNode node) {
        if (!node.isArray()) return List.of();
        return java.util.stream.StreamSupport.stream(node.spliterator(), false)
            .map(JsonNode::asText).map(value -> value.toUpperCase(Locale.ROOT)).toList();
    }

    private static Color color(String value, String fallback) {
        try { return Color.decode(value.matches("^#[0-9a-fA-F]{6}$") ? value : fallback); }
        catch (NumberFormatException ignored) { return Color.decode(fallback); }
    }

    private static String font(String value) {
        return switch (value.toUpperCase(Locale.ROOT)) {
            case "TIMES", "COURIER" -> value.toUpperCase(Locale.ROOT);
            default -> "HELVETICA";
        };
    }

    public record Theme(Color primary, Color accent, Color text, Color muted, Color border,
                        String headingFont, String bodyFont) {}
}
