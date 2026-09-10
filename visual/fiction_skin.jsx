var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.fictionSkin = {
    apply: function (doc, t, base, context) {
        if (t.special_skin_enabled !== false || t.body_style_source !== "P_Body_CN") { throw new Error("Unsupported Fiction visual contract"); }
        var prior = doc.extractLabel("SHAN_VISUAL_FONTS");
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks,
            paragraph_styles: { P_Fiction_Chapter: t.fiction_chapter_style } }, context);
        doc.insertLabel("SHAN_VISUAL_FONTS", prior + "\n" + doc.extractLabel("SHAN_VISUAL_FONTS"));
        var objectStyle = doc.objectStyles.itemByName("O_Text_Main");
        objectStyle.textFramePreferences.textColumnCount = t.body_columns;
        objectStyle.textFramePreferences.textColumnGutter = t.column_gutter_mm + " mm";
        var names = ["P_Article_Title", "P_Author", "P_Metadata", "P_Fiction_Chapter", t.body_style_source], i, style, span;
        // Paragraph styles carry the verified span API; Body keeps normal column flow.
        for (i = 0; i < names.length; i += 1) {
            style = doc.paragraphStyles.itemByName(names[i]);
            if (!style.isValid) { throw new Error("Missing Fiction style: " + names[i]); }
            span = i < 3 ? t.opener_span_columns : (i === 3 ? t.chapter_heading_span_columns : false);
            style.spanColumnType = span ? SpanColumnTypeOptions.SPAN_COLUMNS : SpanColumnTypeOptions.SINGLE_COLUMN;
            if (span) { style.spanSplitColumnCount = t.body_columns; }
        }
    }
};
