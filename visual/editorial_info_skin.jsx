var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.editorialInfoSkin = {
    apply: function (doc, tokens, base, context) {
        var key, def, style, selected, fonts = app.fonts.everyItem().getElements();
        for (key in tokens.styles) {
            if (!tokens.styles.hasOwnProperty(key)) { continue; }
            def = tokens.styles[key]; style = SHAN.utils.ensureNamed(doc.paragraphStyles, key);
            selected = SHAN.typography.chooseFont(fonts, base.font_stacks[def.family], def.weight);
            if (!selected) { throw new Error("Editorial info: missing approved font for " + key); }
            style.appliedFont = selected.font; style.pointSize = def.size_pt; style.leading = def.leading_pt;
            style.fillColor = doc.colors.itemByName(def.color || "C_TEXT");
            style.spaceBefore = SHAN.utils.pt(def.space_before_mm || 0);
            style.spaceAfter = SHAN.utils.pt(def.space_after_mm || 0);
            style.keepWithNext = def.keep_with_next || 0;
            style.keepAllLinesTogether = key === "P_Editorial_Section";
            style.firstLineIndent = 0;
        }
    }
};
