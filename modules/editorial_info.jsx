var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.editorialInfo = {
    check: function (value, message) { if (!value) { throw new Error("Editorial info: " + message); } },
    readJSON: function (root, path) { return SHAN.chapter.parseJSON(SHAN.historySource.read(File(root + "/" + path))); },
    source: function (root) {
        var audit = this.readJSON(root, "spec/EDITORIAL_INFO_SOURCE_AUDIT.json"), helper = SHAN.historySource;
        // Reuse the already host-verified, namespace-aware XML reader and SHA utility;
        // never call History's specialized verifySource or change its locked archive.
        this.check(helper.sha256(helper.read(File(root + "/" + audit.source_file), "BINARY")) === audit.source_sha256, "DOCX hash changed");
        var xml = helper.read(File(root + "/" + audit.xml_file));
        this.check(helper.sha256(helper.read(File(root + "/" + audit.xml_file), "BINARY")) === audit.xml_sha256, "Source XML hash changed");
        var parsed = helper.parse(xml), i;
        this.check(parsed.paragraphs.length === audit.source_paragraph_count && parsed.textboxes.length === 0, "Source structure mismatch");
        for (i = 0; i < parsed.paragraphs.length; i += 1) {
            this.check(helper.sha256(helper.utf8(parsed.paragraphs[i])) === audit.source_paragraph_sha256[i], "Source paragraph mismatch " + (i + 1));
        }
        return {audit: audit, paragraphs: parsed.paragraphs};
    },
    frame: function (doc, page) {
        page.appliedMaster = doc.masterSpreads.itemByName("I-FRONT");
        var bounds = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt, left = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add(); frame.appliedObjectStyle = doc.objectStyles.item(0);
        frame.label = "SHAN_EDITORIAL_INFO:body"; frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.geometricBounds = [bounds[0] + pt(m.top), bounds[1] + pt(left ? m.outside : m.inside), bounds[2] - pt(m.bottom), bounds[3] - pt(left ? m.inside : m.outside)];
        frame.textFramePreferences.textColumnCount = 1; frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        return frame;
    },
    create: function (doc, root, tokens) {
        this.check(doc.pages.length === 1 && doc.pages.item(0).textFrames.length === 0, "Requires a fresh Foundation document");
        var source = this.source(root), first = this.frame(doc, doc.pages.item(0)), story = first.parentStory, i, paragraph, style;
        doc.textPreferences.smartTextReflow = false;
        story.contents = source.paragraphs.join("\r"); story.label = "SHAN_EDITORIAL_INFO:main";
        this.check(story.paragraphs.length === source.paragraphs.length, "Paragraph count changed on import");
        for (i = 0; i < story.paragraphs.length; i += 1) {
            paragraph = story.paragraphs.item(i);
            style = source.audit.style_mapping[String(i + 1)] || "P_Editorial_Body";
            paragraph.applyParagraphStyle(doc.paragraphStyles.itemByName(style), true);
        }
        var last = first, end = -1, now, next;
        doc.recompose();
        while (story.overflows) {
            this.check(doc.pages.length < tokens.max_pages, "Overset exceeds page safety limit");
            now = last.insertionPoints.item(-1).index; this.check(now > end, "Overset made no progress"); end = now;
            next = this.frame(doc, doc.pages.add(LocationOptions.AT_END)); last.nextTextFrame = next; last = next; doc.recompose();
        }
        this.check(!story.overflows, "Final overset");
        for (i = 0; i < story.paragraphs.length; i += 1) {
            paragraph = story.paragraphs.item(i);
            // Only the host's terminal paragraph delimiter is removed. No trim,
            // whitespace conversion, bracket correction, or text normalization.
            this.check(SHAN.historySource.paragraphText(paragraph.contents, 0) === source.paragraphs[i], "Text changed at source paragraph " + (i + 1));
            this.check(paragraph.lines.length > 0 && paragraph.parentTextFrames.length > 0, "Invisible source paragraph " + (i + 1));
        }
        var report = "PASS Editorial info; pages=" + doc.pages.length + "; paragraphs=" + story.paragraphs.length + "; sourceSHA=PASS; paragraphEquality=PASS; overset=false";
        doc.insertLabel("SHAN_EDITORIAL_INFO_REPORT", report);
        return {story: story, report: report};
    }
};
