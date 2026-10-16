var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.messagesSkin = {
    apply: function (doc, t, base, context) {
        var fill = SHAN.utils.ensureNamed(doc.colors, "C_Message_Name_Fill");
        fill.model = ColorModel.PROCESS; fill.space = ColorSpace.RGB; fill.colorValue = t.name_fill_rgb;
        var white = SHAN.utils.ensureNamed(doc.colors, "C_Message_Name_White");
        white.model = ColorModel.PROCESS; white.space = ColorSpace.RGB; white.colorValue = [255, 255, 255];
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
        cs.appliedFont = header.appliedFont; cs.fontStyle = "Medium";
        cs.characterAlignment = CharacterAlignment.ALIGN_BASELINE; cs.baselineShift = 0;
        cs.pointSize = t.name_size_pt; cs.fillColor = white; cs.fillTint = 100;
    }
};
