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
            style.justification = Justification.LEFT_ALIGN;
            if ((name === "P_Message_Body" || name === "P_Message_Riddle")) { style.justification = Justification.LEFT_JUSTIFIED; }
            if (name === "P_Message_InternalTitle") { style.justification = Justification.CENTER_ALIGN; }
            style.hyphenation = false; style.fillTint = 100;
            style.keepWithNext = (name === "P_Message_Header" || name === "P_Message_InternalTitle") ? t.header_keep_body_lines : 0;
            style.keepAllLinesTogether = name === "P_Message_Header" || name === "P_Message_InternalTitle";
            style.keepFirstLines = 2; style.keepLastLines = 2;
            style.ruleAbove = false; style.ruleBelow = false;
        } }
        var doubleStroke = null;
        for (var ui = 0; ui < t.double_underline.stroke_style_candidates.length; ui += 1) {
            var candidate = doc.strokeStyles.itemByName(t.double_underline.stroke_style_candidates[ui]);
            if (candidate && candidate.isValid) { doubleStroke = candidate; break; }
        }
        SHAN.messages.check(doubleStroke, "No native double-stripe stroke style");
        var underline = SHAN.utils.ensureNamed(doc.characterStyles,"C_Message_DoubleUnderline");
        underline.underline = true; underline.underlineType = doubleStroke;
        underline.underlineWeight = t.double_underline.weight_pt; underline.underlineOffset = t.double_underline.offset_pt;
        var header = doc.paragraphStyles.itemByName("P_Message_Header");
        header.characterAlignment = CharacterAlignment.ALIGN_BASELINE;
        header.firstLineIndent = SHAN.utils.pt(t.name_padding_mm[1]);
        var cs = SHAN.utils.ensureNamed(doc.characterStyles, "C_Message_Name");
        var selected = SHAN.typography.chooseFont(app.fonts.everyItem().getElements(), base.font_stacks[t.name_family], t.name_weight);
        SHAN.messages.check(selected && selected.exact, "Requested Messages name font unavailable");
        cs.appliedFont = selected.font; cs.fontStyle = selected.font.fontStyleName;
        cs.characterAlignment = CharacterAlignment.ALIGN_BASELINE; cs.baselineShift = 0;
        cs.pointSize = t.name_size_pt; cs.fillColor = doc.colors.itemByName("C_TEXT"); cs.fillTint = 100;
    }
};
