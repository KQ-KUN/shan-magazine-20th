var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.frontNoteSkin = {
    fontDef: function (definition) {
        return { family: definition.family, weight_preference: definition.weight,
            size_pt: definition.size_pt, leading_pt: definition.leading_pt,
            first_line_indent_em: definition.first_line_indent_em,
            space_before_mm: definition.space_before_mm, space_after_mm: definition.space_after_mm,
            color: definition.color };
    },
    apply: function (doc, tokens, base, context) {
        var names = ["P_FrontNote_Title", "P_FrontNote_Body", "P_FrontNote_Signature"], i, style;
        for (i = 0; i < names.length; i += 1) {
            style = SHAN.utils.ensureNamed(doc.paragraphStyles, names[i]);
            style.basedOn = doc.paragraphStyles.item(0);
        }
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: {
            P_FrontNote_Title: this.fontDef(tokens.title),
            P_FrontNote_Body: this.fontDef(tokens.body),
            P_FrontNote_Signature: this.fontDef(tokens.signature)
        } }, context);
        doc.paragraphStyles.itemByName("P_FrontNote_Title").justification = Justification.LEFT_ALIGN;
        doc.paragraphStyles.itemByName("P_FrontNote_Signature").justification = Justification.RIGHT_ALIGN;
    }
};
