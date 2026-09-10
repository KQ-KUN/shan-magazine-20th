var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.chapterSkin = {
    example: function (doc, page, section, t) {
        var b = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var left = b[1] + pt(page.side === PageSideOptions.LEFT_HAND ? m.outside : m.inside);
        var right = b[3] - pt(page.side === PageSideOptions.LEFT_HAND ? m.inside : m.outside);
        var top = b[0] + pt(m.top), bottom = b[2] - pt(m.bottom);
        var fields = ["display_index", "cn", "en", "intro"];
        var styles = ["P_Chapter_Number", "P_Section_Title_CN", "P_Section_Title_EN", "P_Chapter_Intro"];
        var layout = t.chapter_visual.layout, slots = ["number", "title", "english", "intro"];
        var i, width, line, box, x, y;
        page.appliedMaster = doc.masterSpreads.itemByName("H-CHAPTER");
        SHAN.document.applyMargins(page.marginPreferences);
        page.label = "SHAN_CHAPTER:" + section.id;
        for (i = 0; i < fields.length; i += 1) {
            if (i === 0 && section.display_index === null) { continue; }
            box = layout[slots[i]];
            width = box.width_modules !== undefined ? pt(SHAN.utils.moduleWidthMM() * box.width_modules + SHAN.spec.gutterMM * (box.width_modules - 1)) : pt(box.width_mm);
            x = left + pt(box.left_offset_mm); y = top + pt(box.top_offset_mm);
            SHAN.chapter.addFrame(doc, page, section, fields[i], styles[i], [y, x, y + pt(box.height_mm), x + width]);
        }
        box = layout.slash;
        x = left + pt(box.left_offset_mm); y = top + pt(box.top_offset_mm);
        line = page.graphicLines.add(); line.label = "SHAN_VISUAL:chapter_separator";
        line.geometricBounds = [y, x, y + pt(box.height_mm), x + pt(box.width_mm)];
        line.strokeWeight = box.stroke_pt;
        line.strokeColor = doc.colors.itemByName(box.color);
        // A single strata baseline: only token weight/color and existing margin endpoints.
        // TODO: DESIGN VALUE — contour curves/strata bands need approved path coordinates.
        line = page.graphicLines.add(); line.label = "SHAN_VISUAL:chapter_strata";
        line.geometricBounds = [bottom - pt(layout.baseline_bottom_offset_mm), left, bottom - pt(layout.baseline_bottom_offset_mm), right];
        line.strokeWeight = t.chapter_visual.motif_weight_pt;
        line.strokeColor = doc.colors.itemByName(t.chapter_visual.motif_color);
    }
};
