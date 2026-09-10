var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.visualSystem = {
    apply: function (doc, t, context) {
        SHAN.visualTokens.validate(t);
        SHAN.typography.apply(doc, t, context);
        SHAN.interviewSkin.apply(doc, t);
        SHAN.runningSystem.apply(doc, t);
        doc.insertLabel("SHAN_VISUAL_SYSTEM", t.version + "; prototype RGB; print CMYK pending");
    },
    createTestDocument: function (root, context) {
        var tokens = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var manifest = SHAN.chapter.readManifest(File(root + "/spec/CONTENT_MANIFEST.json"));
        var section, i;
        for (i = 0; i < manifest.sections.length; i += 1) { if (manifest.sections[i].id === "origin") { section = manifest.sections[i]; } }
        if (!section) { throw new Error("Missing origin chapter example"); }
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.visualSystem.apply(doc, tokens, context);
        var story = SHAN.interviewSkin.sample(doc, File(root + "/manuscripts/01_interview_邵珠瑜_贾锦阳.docx"), 6, context, tokens);
        var page = doc.pages.add(LocationOptions.BEFORE, doc.pages.item(0));
        SHAN.chapterSkin.example(doc, page, section, tokens);
        doc.recompose();
        // Inserting the opener changes page sides: realign only page-owned frames.
        for (i = 1; i < doc.pages.length; i += 1) {
            page = doc.pages.item(i);
            var frame = page.textFrames.item(0), b = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
            frame.geometricBounds = [b[0] + pt(m.top), b[1] + pt(page.side === PageSideOptions.LEFT_HAND ? m.outside : m.inside), b[2] - pt(m.bottom), b[3] - pt(page.side === PageSideOptions.LEFT_HAND ? m.inside : m.outside)];
        }
        doc.recompose();
        if (story.overflows) { throw new Error("Visual interview excerpt still overset after opener insertion"); }
        doc.insertLabel("SHAN_VISUAL_WARNINGS", context.warnings.join("\n"));
        return doc;
    }
};
