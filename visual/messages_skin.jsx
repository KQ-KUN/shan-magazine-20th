var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.messagesSkin = {
    apply: function (doc, t, base, context) {
        for (var pi = 0; pi < t.palettes.length; pi += 1) {
            var palette = t.palettes[pi];
            for (var layer = 0; layer < 2; layer += 1) {
                var key = layer === 0 ? "primary" : "shadow";
                var color = SHAN.utils.ensureNamed(doc.colors, "C_Message_" + palette.name + "_" + key);
                color.model = ColorModel.PROCESS; color.space = ColorSpace.RGB; color.colorValue = palette[key];
            }
        }
        var name, style;
        for (name in t.styles) { if (t.styles.hasOwnProperty(name)) { SHAN.utils.ensureNamed(doc.paragraphStyles, name); } }
        SHAN.typography.apply(doc, {colors: {}, font_stacks: base.font_stacks, paragraph_styles: t.styles}, context);
        for (name in t.styles) { if (t.styles.hasOwnProperty(name)) {
            style = doc.paragraphStyles.itemByName(name);
            style.spanColumnType = SpanColumnTypeOptions.SINGLE_COLUMN;
            style.justification = name === "P_Message_Body" ? Justification.LEFT_JUSTIFIED : Justification.LEFT_ALIGN;
            style.hyphenation = false; style.fillTint = 100;
            style.keepWithNext = name === "P_Message_Header" ? t.header_keep_body_lines : 0;
            style.keepAllLinesTogether = name === "P_Message_Header";
            style.keepFirstLines = 2; style.keepLastLines = 2;
            style.ruleAbove = false; style.ruleBelow = false;
        } }
        var header = doc.paragraphStyles.itemByName("P_Message_Header");
        header.characterAlignment = CharacterAlignment.ALIGN_BASELINE;
        header.firstLineIndent = SHAN.utils.pt(t.name_padding_mm[1]);
        var cs = SHAN.utils.ensureNamed(doc.characterStyles, "C_Message_Name");
        cs.appliedFont = header.appliedFont; cs.fontStyle = "Bold";
        cs.characterAlignment = CharacterAlignment.ALIGN_BASELINE; cs.baselineShift = 0;
        cs.pointSize = t.name_size_pt; cs.fillColor = doc.colors.itemByName("C_TEXT"); cs.fillTint = 100;
    }
};
