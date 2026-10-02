var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.historySkin = {
    apply: function (doc, tokens, base, context) {
        var key, style, def, prior = doc.extractLabel("SHAN_VISUAL_FONTS");
        for (key in tokens.paragraph_styles) {
            if (tokens.paragraph_styles.hasOwnProperty(key)) {
                style = SHAN.utils.ensureNamed(doc.paragraphStyles, key);
                style.basedOn = SHAN.historySource.at(doc.paragraphStyles, 0);
            }
        }
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: tokens.paragraph_styles }, context);
        doc.insertLabel("SHAN_VISUAL_FONTS", prior + "\n" + doc.extractLabel("SHAN_VISUAL_FONTS"));
        for (key in tokens.paragraph_styles) {
            if (!tokens.paragraph_styles.hasOwnProperty(key)) { continue; }
            style = doc.paragraphStyles.itemByName(key);
            def = tokens.paragraph_styles[key];
            style.spanColumnType = SpanColumnTypeOptions.SINGLE_COLUMN;
            style.keepLinesTogether = true;
            style.keepFirstLines = def.keep_first_lines || 2; style.keepLastLines = def.keep_last_lines || 2;
            style.keepAllLinesTogether = def.keep_all_lines_together !== undefined ? def.keep_all_lines_together : key !== "P_History_Event";
            style.keepWithNext = def.keep_with_next || 0;
            style.justification = Justification.LEFT_ALIGN;
            if (key.indexOf("P_History_Media") === 0) { style.justification = Justification.CENTER_ALIGN; }
        }
        // Legacy Wide definitions remain single-column and are never mapped to content.
        style = doc.paragraphStyles.itemByName("P_Article_Title");
        style.keepAllLinesTogether = true; style.keepWithNext = 2;
        // Preserve the approved text title only; no image/caption has a spanning style.
        style.spanColumnType = SpanColumnTypeOptions.SPAN_COLUMNS; style.spanSplitColumnCount = 2;
        doc.paragraphStyles.itemByName("P_Metadata").keepWithNext = 1;
    }
};
