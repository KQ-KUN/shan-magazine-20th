var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.memoirSkin = {
    apply: function (doc, t, base, context) {
        if (t.special_skin_enabled !== false) { throw new Error("Unsupported Memoir visual contract"); }
        var names = [t.body_style.name, t.section_style.name, t.media_style.name, t.caption_style.name];
        var i, style, prior = doc.extractLabel("SHAN_VISUAL_FONTS");
        for (i = 0; i < names.length; i += 1) {
            style = SHAN.utils.ensureNamed(doc.paragraphStyles, names[i]);
            style.basedOn = doc.paragraphStyles.item(0);
        }
        var definitions = {};
        definitions[t.body_style.name] = t.body_style;
        definitions[t.section_style.name] = t.section_style;
        definitions[t.caption_style.name] = t.caption_style;
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: definitions }, context);
        doc.insertLabel("SHAN_VISUAL_FONTS", prior + "\n" + doc.extractLabel("SHAN_VISUAL_FONTS"));
        style = doc.paragraphStyles.itemByName(t.media_style.name);
        style.spaceBefore = SHAN.utils.pt(t.media_style.space_before_mm);
        style.spaceAfter = SHAN.utils.pt(t.media_style.space_after_mm);
        var objectStyle = doc.objectStyles.itemByName("O_Text_Main");
        objectStyle.textFramePreferences.textColumnCount = t.body_columns;
        objectStyle.textFramePreferences.textColumnGutter = t.column_gutter_mm + " mm";
        names = t.span_styles.concat([t.body_style.name]);
        for (i = 0; i < names.length; i += 1) {
            style = doc.paragraphStyles.itemByName(names[i]);
            if (!style.isValid) { throw new Error("Missing Memoir style: " + names[i]); }
            style.spanColumnType = i < t.span_styles.length ? SpanColumnTypeOptions.SPAN_COLUMNS : SpanColumnTypeOptions.SINGLE_COLUMN;
            if (i < t.span_styles.length) { style.spanSplitColumnCount = t.body_columns; }
        }
    }
};
