var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.chapterSkin = {
    example: function (doc, page, section, t) {
        var b = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var left = b[1] + pt(page.side === PageSideOptions.LEFT_HAND ? m.outside : m.inside);
        var right = b[3] - pt(page.side === PageSideOptions.LEFT_HAND ? m.inside : m.outside);
        var top = b[0] + pt(m.top), bottom = b[2] - pt(m.bottom);
        var fields = ["display_index", "cn", "en", "intro"];
        var styles = ["P_Chapter_Number", "P_Section_Title_CN", "P_Section_Title_EN", "P_Chapter_Intro"];
        // Keep the frozen Chapter's structural slots; do not invent opener coordinates.
        var step = (bottom - top) / fields.length, i, width, line;
        page.appliedMaster = doc.masterSpreads.itemByName("H-CHAPTER");
        SHAN.document.applyMargins(page.marginPreferences);
        page.label = "SHAN_CHAPTER:" + section.id;
        for (i = 0; i < fields.length; i += 1) {
            if (i === 0 && section.display_index === null) { continue; }
            width = fields[i] === "intro" ? pt(SHAN.utils.moduleWidthMM() * t.chapter_visual.intro_max_width_modules + SHAN.spec.gutterMM * (t.chapter_visual.intro_max_width_modules - 1)) : right - left;
            SHAN.chapter.addFrame(doc, page, section, fields[i], styles[i], [top + step * i, left, top + step * (i + 1), left + width]);
        }
        // A single strata baseline: only token weight/color and existing margin endpoints.
        // TODO: DESIGN VALUE — contour curves/strata bands need approved path coordinates.
        line = page.graphicLines.add(); line.label = "SHAN_VISUAL:chapter_strata";
        line.geometricBounds = [bottom, left, bottom, right];
        line.strokeWeight = t.chapter_visual.motif_weight_pt;
        line.strokeColor = doc.colors.itemByName(t.chapter_visual.motif_color);
    }
};
