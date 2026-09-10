var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.typography = {
    chooseFont: function (fonts, stack, weight) {
        var i, j, candidates, fallback;
        for (i = 0; i < stack.length; i += 1) {
            candidates = []; fallback = null;
            for (j = 0; j < fonts.length; j += 1) {
                if (fonts[j].status === FontStatus.INSTALLED && fonts[j].fontFamily === stack[i]) { candidates.push(fonts[j]); }
            }
            for (j = 0; j < candidates.length; j += 1) {
                if (candidates[j].fontStyleName === (weight || "Regular")) { return { font: candidates[j], exact: true }; }
                if (candidates[j].fontStyleName === "Regular") { fallback = candidates[j]; }
            }
            // Only a regular face from an approved family may serve as fallback.
            if (fallback) { return { font: fallback, exact: !weight }; }
        }
        return null;
    },
    apply: function (doc, t, context) {
        var key, def, style, selected, fonts = app.fonts.everyItem().getElements(), report = [];
        for (key in t.colors) {
            if (!t.colors.hasOwnProperty(key)) { continue; }
            style = doc.colors.itemByName(key);
            if (!style.isValid) { throw new Error("Missing Foundation color: " + key); }
            style.model = ColorModel.PROCESS; style.space = ColorSpace.RGB;
            style.colorValue = t.colors[key].rgb;
            style.label = t.colors[key].provisional ? "PROVISIONAL_RGB; print CMYK pending" : "VISUAL_TOKEN_RGB";
            if (t.colors[key].special_only) { style.label = "SPECIAL_ONLY; not for running system"; }
        }
        for (key in t.paragraph_styles) {
            if (!t.paragraph_styles.hasOwnProperty(key)) { continue; }
            def = t.paragraph_styles[key]; style = doc.paragraphStyles.itemByName(key);
            if (!style.isValid) { throw new Error("Missing Foundation paragraph style: " + key); }
            selected = this.chooseFont(fonts, t.font_stacks[def.family], def.weight_preference);
            if (selected) {
                style.appliedFont = selected.font;
                report.push(key + ": " + selected.font.name);
                if (!selected.exact) { SHAN.utils.warn(context, key + " 字重 " + def.weight_preference + " 缺失；使用批准字体家族的 Regular。"); }
            } else {
                report.push(key + ": MISSING APPROVED FONT");
                SHAN.utils.warn(context, key + " 批准字体栈不可用；未替换字体，宿主原字体不视为批准视觉结果。");
            }
            style.pointSize = def.size_pt; style.leading = def.leading_pt;
            style.fillColor = doc.colors.itemByName(def.color || "C_TEXT");
            if (def.tracking !== undefined) { style.tracking = def.tracking; }
            if (def.first_line_indent_em !== undefined) { style.firstLineIndent = def.first_line_indent_em * def.size_pt; }
            if (def.space_before_mm !== undefined) { style.spaceBefore = SHAN.utils.pt(def.space_before_mm); }
            if (def.space_after_mm !== undefined) { style.spaceAfter = SHAN.utils.pt(def.space_after_mm); }
            if (def.rule_above) {
                style.ruleAbove = true; style.ruleAboveLineWeight = def.rule_above.weight_pt;
                style.ruleAboveColor = doc.colors.itemByName(def.rule_above.color);
                style.ruleAboveOffset = SHAN.utils.pt(def.rule_above.offset_mm);
            }
            if (def.left_rule) {
                style.paragraphBorderOn = true;
                style.paragraphBorderLeftLineWeight = def.left_rule.weight_pt;
                style.paragraphBorderTopLineWeight = 0; style.paragraphBorderRightLineWeight = 0; style.paragraphBorderBottomLineWeight = 0;
                style.paragraphBorderColor = doc.colors.itemByName(def.left_rule.color);
            }
        }
        doc.insertLabel("SHAN_VISUAL_FONTS", report.join("\n"));
        return report;
    }
};
