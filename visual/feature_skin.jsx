var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.featureSkin = {
    fontDef: function (d) {
        return { family: d.family, weight_preference: d.weight, size_pt: d.size_pt, leading_pt: d.leading_pt,
            first_line_indent_em: d.first_line_indent_em, space_before_mm: d.space_before_mm,
            space_after_mm: d.space_after_mm, color: d.color, rule_above: d.rule_above };
    },
    apply: function (doc, t, base, context) {
        var names = ["P_Feature_Body", "P_Feature_Lead", "P_Feature_Section", "P_Feature_Media", "P_Feature_Caption"];
        var i, style, prior = doc.extractLabel("SHAN_VISUAL_FONTS");
        for (i = 0; i < names.length; i += 1) {
            style = SHAN.utils.ensureNamed(doc.paragraphStyles, names[i]); style.basedOn = doc.paragraphStyles.item(0);
        }
        var definitions = {
            P_Feature_Body: this.fontDef(t.body), P_Feature_Lead: this.fontDef(t.lead),
            P_Feature_Section: this.fontDef(t.section), P_Feature_Caption: this.fontDef(t.caption)
        };
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: definitions }, context);
        doc.insertLabel("SHAN_VISUAL_FONTS", prior + "\n" + doc.extractLabel("SHAN_VISUAL_FONTS"));
        style = doc.paragraphStyles.itemByName("P_Feature_Media");
        style.spaceBefore = SHAN.utils.pt(t.media.space_before_mm); style.spaceAfter = SHAN.utils.pt(t.media.space_after_mm);
        var objectStyle = doc.objectStyles.itemByName("O_Text_Main");
        objectStyle.textFramePreferences.textColumnCount = t.body_columns;
        objectStyle.textFramePreferences.textColumnGutter = t.column_gutter_mm + " mm";
        names = t.span_styles.concat(["P_Feature_Body"]);
        for (i = 0; i < names.length; i += 1) {
            style = doc.paragraphStyles.itemByName(names[i]);
            if (!style.isValid) { throw new Error("Missing Feature style: " + names[i]); }
            style.spanColumnType = i < t.span_styles.length ? SpanColumnTypeOptions.SPAN_COLUMNS : SpanColumnTypeOptions.SINGLE_COLUMN;
            if (i < t.span_styles.length) { style.spanSplitColumnCount = t.body_columns; }
        }
    }
};
