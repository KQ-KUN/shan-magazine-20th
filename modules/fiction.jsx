var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.fiction = {
    styleMap: {
        ArticleTitle: "P_Article_Title", Author: "P_Author",
        PublicationInfo: "P_Metadata", Metadata: "P_Metadata",
        FictionChapter: "P_Fiction_Chapter", Body: "P_Body_CN",
        Quote: "P_Quote", Caption: "P_Caption"
    },
    checkStyles: function (doc) {
        var name;
        for (name in this.styleMap) {
            if (this.styleMap.hasOwnProperty(name) && !doc.paragraphStyles.itemByName(this.styleMap[name]).isValid) {
                throw new Error("Missing InDesign style: " + this.styleMap[name]);
            }
        }
        if (!doc.masterSpreads.itemByName("D-FICTION").isValid) { throw new Error("Missing D-FICTION Parent"); }
        if (!doc.objectStyles.itemByName("O_Text_Main").isValid) { throw new Error("Missing O_Text_Main style"); }
    },
    addFrame: function (doc, page, articleId, index) {
        page.appliedMaster = doc.masterSpreads.itemByName("D-FICTION");
        SHAN.document.applyMargins(page.marginPreferences);
        var bounds = page.bounds, margins = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var isLeft = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add();
        frame.label = "SHAN_FICTION:" + articleId + ":frame:" + index;
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
        if (story.contents !== before) { throw new Error("Fiction text changed during style mapping"); }
        return counts;
    },
    flow: function (doc, story, first, articleId) {
        var last = first, next, pages = 1, lastEnd = -1, end;
        doc.recompose();
        while (story.overflows) {
            // If composition cannot consume text, stop instead of adding pages forever.
            end = last.insertionPoints.item(-1).index;
            if (end <= lastEnd) { throw new Error("Fiction overset remains: no text-flow progress after " + pages + " pages"); }
            lastEnd = end;
            next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), articleId, pages + 1);
            last.nextTextFrame = next;
            last = next; pages += 1;
            doc.recompose();
        }
        return pages;
    },
    create: function (doc, source, articleId) {
        if (!source.exists || !/\.docx$/i.test(source.name)) { throw new Error("Missing/invalid Fiction DOCX: " + source.fsName); }
        if (!/^[a-z][a-z0-9_]*$/.test(articleId)) { throw new Error("Invalid Fiction article_id"); }
        this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Fiction requires a fresh document"); }
        doc.textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, doc.pages.item(0), articleId, 1);
        var story = this.importWord(first, source), before = story.contents;
        if (!before.length) { throw new Error("Fiction DOCX imported no text"); }
        story.label = "SHAN_FICTION:" + articleId + ":story";
        var counts = this.mapStory(doc, story);
        var pages = this.flow(doc, story, first, articleId);
        if (story.contents !== before) { throw new Error("Fiction text changed during flow"); }
        doc.insertLabel("SHAN_FICTION_REPORT", "article=" + articleId + "; pages=" + pages + "; paragraphs=" + story.paragraphs.length + "; chapters=" + (counts.FictionChapter || 0) + "; overset=" + story.overflows + "; text unchanged=true");
        return { story: story, pages: pages, counts: counts, overset: story.overflows };
    }
};
