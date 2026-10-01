var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.historySkin = {
    apply: function (doc, tokens, base, context) {
        var key, style, prior = doc.extractLabel("SHAN_VISUAL_FONTS");
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
            style.spanColumnType = SpanColumnTypeOptions.SINGLE_COLUMN;
            style.keepLinesTogether = true; style.keepFirstLines = 2; style.keepLastLines = 2;
            style.keepAllLinesTogether = key !== "P_History_Event";
            style.keepWithNext = tokens.paragraph_styles[key].keep_with_next || 0;
            style.justification = Justification.LEFT_ALIGN;
        }
        style = doc.paragraphStyles.itemByName("P_History_Media_Wide");
        style.spanColumnType = SpanColumnTypeOptions.SPAN_COLUMNS; style.spanSplitColumnCount = 2;
        style = doc.paragraphStyles.itemByName("P_History_Caption_Wide");
        style.spanColumnType = SpanColumnTypeOptions.SPAN_COLUMNS; style.spanSplitColumnCount = 2;
        style = doc.paragraphStyles.itemByName("P_Article_Title");
        style.keepAllLinesTogether = true; style.keepWithNext = 2;
        style.spanColumnType = SpanColumnTypeOptions.SPAN_COLUMNS; style.spanSplitColumnCount = 2;
        doc.paragraphStyles.itemByName("P_Metadata").keepWithNext = 1;
    }
};
