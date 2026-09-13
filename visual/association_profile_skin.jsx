var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.associationProfileSkin = {
    fontDef: function (definition) {
        return { family: definition.family, weight_preference: definition.weight,
            size_pt: definition.size_pt, leading_pt: definition.leading_pt,
            first_line_indent_em: definition.first_line_indent_em,
            space_before_mm: definition.space_before_mm, space_after_mm: definition.space_after_mm,
            color: definition.color };
    },
    apply: function (doc, tokens, base, context) {
        var names = ["P_Association_Title", "P_Association_Label", "P_Association_Separator",
            "P_Association_Value", "P_Association_Body"], i, style;
        for (i = 0; i < names.length; i += 1) {
            style = SHAN.utils.ensureNamed(doc.paragraphStyles, names[i]); style.basedOn = doc.paragraphStyles.item(0);
        }
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: {
            P_Association_Title: this.fontDef(tokens.title),
            P_Association_Label: this.fontDef(tokens.label),
            P_Association_Separator: this.fontDef(tokens.separator),
            P_Association_Value: this.fontDef(tokens.value),
            P_Association_Body: this.fontDef(tokens.body)
        } }, context);
        for (i = 0; i < names.length; i += 1) { doc.paragraphStyles.itemByName(names[i]).justification = Justification.LEFT_ALIGN; }
    }
};
