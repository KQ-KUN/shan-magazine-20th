var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.memoir = {
    styleMap: {
        ArticleTitle: "P_Article_Title", Author: "P_Author",
        MemoirSection: "P_Memoir_Section", Body: "P_Memoir_Body",
        Media: "P_Memoir_Media", Caption: "P_Memoir_Caption", caption: "P_Memoir_Caption"
    },
    checkStyles: function (doc) {
        var name;
        for (name in this.styleMap) {
            if (this.styleMap.hasOwnProperty(name) && !doc.paragraphStyles.itemByName(this.styleMap[name]).isValid) {
                throw new Error("Missing InDesign style: " + this.styleMap[name]);
            }
        }
        if (!doc.masterSpreads.itemByName("E-MEMOIR").isValid) { throw new Error("Missing E-MEMOIR Parent"); }
        if (!doc.objectStyles.itemByName("O_Text_Main").isValid) { throw new Error("Missing O_Text_Main style"); }
    },
    addFrame: function (doc, page, articleId, index) {
        page.appliedMaster = doc.masterSpreads.itemByName("E-MEMOIR");
        SHAN.document.applyMargins(page.marginPreferences);
        var bounds = page.bounds, margins = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var isLeft = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add();
        frame.label = "SHAN_MEMOIR:" + articleId + ":frame:" + index;
        frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
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
            /* Host probe proved the clean DOCX imports reliably without Word graphics.
               Media is placed separately from an explicit asset manifest. */
            preferences.preserveGraphics = false;
            preferences.useTypographersQuotes = false;
            preferences.importTOC = false; preferences.importIndex = false;
            preferences.importFootnotes = false; preferences.importEndnotes = false;
            preferences.preserveTrackChanges = false;
            preferences.resolveParagraphStyleClash = ResolveStyleClash.RESOLVE_CLASH_USE_EXISTING;
            preferences.resolveCharacterStyleClash = ResolveStyleClash.RESOLVE_CLASH_USE_EXISTING;
            frame.place(source, false);
        } finally { preferences.properties = previous; }
        return frame.parentStory;
    },
    mapStory: function (doc, story) {
        var i, paragraph, sourceName, targets = [], counts = {}, before = story.contents;
        for (i = 0; i < story.paragraphs.length; i += 1) {
            paragraph = story.paragraphs.item(i); sourceName = paragraph.appliedParagraphStyle.name;
            if (!this.styleMap.hasOwnProperty(sourceName)) {
                throw new Error("Unknown Word style: " + sourceName + " (paragraph " + (i + 1) + ")");
            }
            targets.push(doc.paragraphStyles.itemByName(this.styleMap[sourceName]));
            if (!targets[i].isValid) { throw new Error("Missing InDesign style: " + this.styleMap[sourceName]); }
            counts[sourceName] = (counts[sourceName] || 0) + 1;
        }
        for (i = 0; i < targets.length; i += 1) { story.paragraphs.item(i).applyParagraphStyle(targets[i], true); }
        if (story.contents !== before) { throw new Error("Memoir text changed during style mapping"); }
        return counts;
    },
    textOnly: function (value) {
        return String(value).replace(/\uFFFC/g, "");
    },
    placeMedia: function (doc, story, mediaFile, widthMM, heightMM) {
        if (!mediaFile || !mediaFile.exists) { throw new Error("Missing Memoir media asset"); }
        var i, paragraph = null, count = 0;
        for (i = 0; i < story.paragraphs.length; i += 1) {
            if (story.paragraphs.item(i).appliedParagraphStyle.name === "P_Memoir_Media") {
                paragraph = story.paragraphs.item(i);
                count += 1;
            }
        }
        if (count !== 1 || !paragraph) { throw new Error("Expected exactly one Memoir Media paragraph; found " + count); }

        var rect = doc.pages.item(0).rectangles.add();
        rect.label = "SHAN_MEMOIR_MEDIA";
        rect.fillColor = doc.swatches.item(0);
        rect.strokeColor = doc.swatches.item(0);
        rect.geometricBounds = [0, 0, SHAN.utils.pt(heightMM), SHAN.utils.pt(widthMM)];
        rect.place(mediaFile, false);
        rect.fit(FitOptions.PROPORTIONALLY);
        rect.fit(FitOptions.CENTER_CONTENT);
        rect.anchoredObjectSettings.insertAnchoredObject(
            paragraph.insertionPoints.item(0),
            AnchorPosition.ABOVE_LINE
        );
        rect.anchoredObjectSettings.anchorSpaceAbove = 0;
        rect.anchoredObjectSettings.anchorYoffset = 0;
        doc.recompose();
        return rect;
    },
    flow: function (doc, story, first, articleId) {
        var last = first, next, pages = 1, lastEnd = -1, end;
        doc.recompose();
        while (story.overflows) {
            end = last.insertionPoints.item(-1).index;
            if (end <= lastEnd) { throw new Error("Memoir overset remains: no text-flow progress after " + pages + " pages"); }
            lastEnd = end;
            next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), articleId, pages + 1);
            last.nextTextFrame = next; last = next; pages += 1; doc.recompose();
        }
        return pages;
    },
    create: function (doc, source, articleId, mediaFile, mediaWidthMM, mediaHeightMM) {
        if (!source.exists || !/\.docx$/i.test(source.name)) { throw new Error("Missing/invalid Memoir DOCX: " + source.fsName); }
        if (!/^[a-z][a-z0-9_]*$/.test(articleId)) { throw new Error("Invalid Memoir article_id"); }
        this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Memoir requires a fresh document"); }
        doc.textPreferences.smartTextReflow = false;

        var first = this.addFrame(doc, doc.pages.item(0), articleId, 1);
        var story = this.importWord(first, source);
        if (!story.contents.length) { throw new Error("Memoir DOCX imported no text"); }
        story.label = "SHAN_MEMOIR:" + articleId + ":story";

        var sourceText = this.textOnly(story.contents);
        var counts = this.mapStory(doc, story);
        this.placeMedia(doc, story, mediaFile, mediaWidthMM, mediaHeightMM);
        if (this.textOnly(story.contents) !== sourceText) { throw new Error("Memoir visible text changed while placing media"); }

        var pages = this.flow(doc, story, first, articleId);
        if (this.textOnly(story.contents) !== sourceText) { throw new Error("Memoir visible text changed during flow"); }

        var graphics = story.allGraphics.length;
        doc.insertLabel("SHAN_MEMOIR_REPORT",
            "article=" + articleId +
            "; pages=" + pages +
            "; paragraphs=" + story.paragraphs.length +
            "; sections=" + (counts.MemoirSection || 0) +
            "; graphics=" + graphics +
            "; captions=" + ((counts.Caption || 0) + (counts.caption || 0)) +
            "; overset=" + story.overflows +
            "; text unchanged=true");
        return { story: story, pages: pages, counts: counts, graphics: graphics, overset: story.overflows };
    }
};
