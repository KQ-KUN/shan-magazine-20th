var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.interview = {
    // This sample accepts exactly the paragraph roles in INTERVIEW_CONTRACT.
    styleMap: {
        ArticleTitle: "P_Article_Title", ArticleSubtitle: "P_Article_Subtitle",
        Author: "P_Author", Metadata: "P_Metadata", Caption: "P_Caption",
        InterviewQuestion: "P_Interview_Q", InterviewAnswer: "P_Interview_A"
    },
    checkStyles: function (doc) {
        var name;
        for (name in this.styleMap) {
            if (this.styleMap.hasOwnProperty(name) && !doc.paragraphStyles.itemByName(this.styleMap[name]).isValid) {
                throw new Error("Missing InDesign style: " + this.styleMap[name]);
            }
        }
        if (!doc.masterSpreads.itemByName("B-INTERVIEW").isValid) { throw new Error("Missing B-INTERVIEW Parent"); }
        if (!doc.objectStyles.itemByName("O_Text_Main").isValid) { throw new Error("Missing O_Text_Main style"); }
    },
    addFrame: function (doc, page, articleId, index) {
        page.appliedMaster = doc.masterSpreads.itemByName("B-INTERVIEW");
        SHAN.document.applyMargins(page.marginPreferences);
        var bounds = page.bounds, margins = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var isLeft = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add();
        frame.label = "SHAN_INTERVIEW:" + articleId + ":frame:" + index;
        frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = doc.swatches.item(0);
        frame.strokeColor = doc.swatches.item(0);
        frame.geometricBounds = [bounds[0] + pt(margins.top),
            bounds[1] + pt(isLeft ? margins.outside : margins.inside),
            bounds[2] - pt(margins.bottom), bounds[3] - pt(isLeft ? margins.inside : margins.outside)];
        return frame;
    },
    importWord: function (frame, source) {
        var preferences = app.wordRTFImportPreferences, previous = preferences.properties;
        try {
            preferences.removeFormatting = false;
            preferences.importUnusedStyles = false;
            preferences.preserveGraphics = false;
            preferences.useTypographersQuotes = false;
            preferences.importTOC = false;
            preferences.importIndex = false;
            preferences.importFootnotes = true;
            preferences.importEndnotes = true;
            preferences.preserveTrackChanges = true;
            preferences.resolveParagraphStyleClash = ResolveStyleClash.RESOLVE_CLASH_USE_EXISTING;
            preferences.resolveCharacterStyleClash = ResolveStyleClash.RESOLVE_CLASH_USE_EXISTING;
            frame.place(source, false);
        } finally { preferences.properties = previous; }
        return frame.parentStory;
    },
    mapStory: function (doc, story) {
        var i, paragraph, sourceName, targets = [], counts = {}, before = story.contents;
        // Validate all source names before changing any paragraph. Never inspect prose.
        for (i = 0; i < story.paragraphs.length; i += 1) {
            paragraph = story.paragraphs.item(i);
            sourceName = paragraph.appliedParagraphStyle.name;
            if (!this.styleMap.hasOwnProperty(sourceName)) {
                throw new Error("Unknown Word style: " + sourceName + " (paragraph " + (i + 1) + ")");
            }
            targets.push(doc.paragraphStyles.itemByName(this.styleMap[sourceName]));
            if (!targets[i].isValid) { throw new Error("Missing InDesign style: " + this.styleMap[sourceName]); }
            counts[sourceName] = (counts[sourceName] || 0) + 1;
        }
        for (i = 0; i < targets.length; i += 1) { story.paragraphs.item(i).applyParagraphStyle(targets[i], true); }
        if (story.contents !== before) { throw new Error("Interview text changed during style mapping"); }
        return counts;
    },
    flow: function (doc, story, first, articleId) {
        var last = first, next, pages = 1, lastEnd = -1, end;
        doc.recompose();
        while (story.overflows) {
            // If composition cannot consume text, stop instead of adding pages forever.
            end = last.insertionPoints.item(-1).index;
            if (end <= lastEnd) { throw new Error("Interview overset remains: no text-flow progress after " + pages + " pages"); }
            lastEnd = end;
            next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), articleId, pages + 1);
            last.nextTextFrame = next;
            last = next; pages += 1;
            doc.recompose();
        }
        return pages;
    },
    create: function (doc, source, articleId, context) {
        if (!source.exists || !/\.docx$/i.test(source.name)) { throw new Error("Missing/invalid interview DOCX: " + source.fsName); }
        if (!/^[a-z][a-z0-9_]*$/.test(articleId)) { throw new Error("Invalid interview article_id"); }
        this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Interview requires a fresh Foundation document"); }
        // Only this newly created document is controlled by the module's own flow loop.
        doc.textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, doc.pages.item(0), articleId, 1);
        var story = this.importWord(first, source);
        story.label = "SHAN_INTERVIEW:" + articleId + ":story";
        if (!story.contents.length) { throw new Error("Interview DOCX imported no text"); }
        var counts = this.mapStory(doc, story);
        var pages = this.flow(doc, story, first, articleId);
        var report = "article=" + articleId + "; pages=" + pages + "; paragraphs=" + story.paragraphs.length + "; overset=" + story.overflows;
        doc.insertLabel("SHAN_SCOPE", "Interview sample only; final pagination undecided");
        doc.insertLabel("SHAN_INTERVIEW_REPORT", report);
        SHAN.utils.warn(context, report);
        // TODO: DESIGN VALUE — 字体、字号、Q/A 视觉和页眉页脚待统一设计；不修改冻结样式。
        SHAN.utils.warn(context, "Interview 仅完成结构映射与续页；最终字体、Q/A 视觉等尚待批准。");
        return { story: story, pages: pages, counts: counts, overset: story.overflows };
    }
};
