var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.runningSystem = {
    contains: function (list, value) { var i; for (i = 0; i < list.length; i += 1) { if (list[i] === value) { return true; } } return false; },
    text: function (doc, page, label, contents, bounds, styleName, alignment) {
        var frame = page.textFrames.add();
        frame.label = label; frame.appliedObjectStyle = doc.objectStyles.item(0);
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1;
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.geometricBounds = bounds; frame.contents = contents;
        frame.parentStory.paragraphs.everyItem().appliedParagraphStyle = doc.paragraphStyles.itemByName(styleName);
        if (alignment !== undefined) { frame.parentStory.paragraphs.everyItem().justification = alignment; }
        return frame;
    },
    apply: function (doc, t) {
        var i, j, k, master, page, b, left, right, middle, frame, line, paper;
        var r = t.running_system, pt = SHAN.utils.pt, m = SHAN.spec.marginsMM;
        for (i = 0; i < doc.masterSpreads.length; i += 1) {
            master = doc.masterSpreads.item(i);
            for (j = 0; j < master.pages.length; j += 1) {
                page = master.pages.item(j); b = page.bounds;
                for (k = page.pageItems.length - 1; k >= 0; k -= 1) {
                    frame = page.pageItems.item(k);
                    if (frame.label === "SHAN_AUTO_FOLIO" || frame.label.indexOf("SHAN_VISUAL:") === 0) { frame.remove(); }
                }
                paper = page.rectangles.add(); paper.label = "SHAN_VISUAL:paper";
                paper.appliedObjectStyle = doc.objectStyles.item(0); paper.geometricBounds = b;
                paper.fillColor = doc.colors.itemByName("C_PAPER"); paper.strokeColor = doc.swatches.item(0); paper.sendToBack();
                if (this.contains(r.hide_on_parents, master.name)) { continue; }
                left = b[1] + pt(page.side === PageSideOptions.LEFT_HAND ? m.outside : m.inside);
                right = b[3] - pt(page.side === PageSideOptions.LEFT_HAND ? m.inside : m.outside);
                middle = (left + right) / 2;
                this.text(doc, page, "SHAN_VISUAL:folio", SpecialCharacters.AUTO_PAGE_NUMBER,
                    [b[0] + pt(r.footer_y_mm), left, b[2], right], r.folio_style);
                if (this.contains(r.minimal_on_parents, master.name)) { continue; }
                this.text(doc, page, "SHAN_VISUAL:header_left", r.static_left,
                    [b[0] + pt(r.header_y_mm), left, b[0] + pt(r.header_rule_y_mm), middle], r.header_font_style, Justification.LEFT_ALIGN);
                this.text(doc, page, "SHAN_VISUAL:header_right", r.static_right,
                    [b[0] + pt(r.header_y_mm), middle, b[0] + pt(r.header_rule_y_mm), right], r.header_font_style, Justification.RIGHT_ALIGN);
                line = page.graphicLines.add(); line.label = "SHAN_VISUAL:header_rule";
                line.geometricBounds = [b[0] + pt(r.header_rule_y_mm), left, b[0] + pt(r.header_rule_y_mm), right];
                line.strokeWeight = r.header_rule_weight_pt; line.strokeColor = doc.colors.itemByName("C_LINE");
            }
        }
    }
};
