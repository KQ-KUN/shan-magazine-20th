var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.coverSystemSkin = {
    fontDef: function (definition) {
        return { family: definition.family, weight_preference: definition.weight,
            size_pt: definition.size_pt, leading_pt: definition.leading_pt,
            tracking: definition.tracking, space_before_mm: 0, space_after_mm: 0,
            color: definition.color };
    },
    apply: function (doc, tokens, base, context) {
        var names = ["P_Cover_Title", "P_Cover_Subtitle", "P_Cover_Years",
            "P_Cover_Back_Organization", "P_Cover_Back_Wechat"], i, style;
        for (i = 0; i < names.length; i += 1) {
            style = SHAN.utils.ensureNamed(doc.paragraphStyles, names[i]);
            style.basedOn = doc.paragraphStyles.item(0);
        }
        SHAN.typography.apply(doc, { colors: {}, font_stacks: base.font_stacks, paragraph_styles: {
            P_Cover_Title: this.fontDef(tokens.front.title),
            P_Cover_Subtitle: this.fontDef(tokens.front.subtitle),
            P_Cover_Years: this.fontDef(tokens.front.years),
            P_Cover_Back_Organization: this.fontDef(tokens.back.organization),
            P_Cover_Back_Wechat: this.fontDef(tokens.back.wechat)
        } }, context);
        for (i = 0; i < names.length; i += 1) {
            doc.paragraphStyles.itemByName(names[i]).justification = Justification.LEFT_ALIGN;
        }
    }
};
