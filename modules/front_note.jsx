var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.frontNote = {
    checkStyles: function (doc) {
        var names = ["P_FrontNote_Title", "P_FrontNote_Body", "P_FrontNote_Signature"], i;
        for (i = 0; i < names.length; i += 1) {
            if (!doc.paragraphStyles.itemByName(names[i]).isValid) { throw new Error("Missing Front Note style: " + names[i]); }
        }
        if (!doc.masterSpreads.itemByName("I-FRONT").isValid) { throw new Error("Missing I-FRONT Parent"); }
        if (!doc.objectStyles.itemByName("O_Text_Main").isValid) { throw new Error("Missing O_Text_Main style"); }
    },
    addFrame: function (doc, page, articleId, index, tokens) {
        var bounds = page.bounds, pt = SHAN.utils.pt;
        var middle = (bounds[1] + bounds[3]) / 2, half = pt(tokens.text_width_mm) / 2;
        page.appliedMaster = doc.masterSpreads.itemByName("I-FRONT");
        var frame = page.textFrames.add();
        frame.label = "SHAN_FRONT_NOTE:" + articleId + ":frame:" + index;
        frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1;
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.geometricBounds = [bounds[0] + pt(tokens.top_mm), middle - half,
            bounds[2] - pt(tokens.bottom_mm), middle + half];
        return frame;
    },
    importWord: function (frame, source) {
        var preferences = app.wordRTFImportPreferences, previous = preferences.properties;
        try {
            preferences.removeFormatting = true; preferences.importUnusedStyles = false;
            preferences.preserveGraphics = false; preferences.useTypographersQuotes = false;
            preferences.importTOC = false; preferences.importIndex = false;
            preferences.importFootnotes = false; preferences.importEndnotes = false;
            preferences.preserveTrackChanges = false;
            frame.place(source, false);
        } finally { preferences.properties = previous; }
        return frame.parentStory;
    },
    mapStory: function (doc, story, hasSignature) {
        var before = story.contents, count = story.paragraphs.length, i, style;
        if (count < 2) { throw new Error("Front Note requires a title and body"); }
        for (i = 0; i < count; i += 1) {
            style = i === 0 ? "P_FrontNote_Title" :
                (hasSignature && i === count - 1 ? "P_FrontNote_Signature" : "P_FrontNote_Body");
            story.paragraphs.item(i).applyParagraphStyle(doc.paragraphStyles.itemByName(style), true);
        }
        if (story.contents !== before) { throw new Error("Front Note text changed during style mapping"); }
        return { title: 1, body: count - 1 - (hasSignature ? 1 : 0), signature: hasSignature ? 1 : 0 };
    },
    flow: function (doc, story, first, articleId, tokens) {
        var last = first, pages = 1, lastEnd = -1, end, next;
        doc.recompose();
        while (story.overflows) {
            end = last.insertionPoints.item(-1).index;
            if (end <= lastEnd) { throw new Error("Front Note overset remains: no text-flow progress after " + pages + " pages"); }
            lastEnd = end;
            next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), articleId, pages + 1, tokens);
            last.nextTextFrame = next; last = next; pages += 1; doc.recompose();
        }
        return pages;
    },
    create: function (doc, source, articleId, tokens, options) {
        options = options || {};
        if (!source.exists || !/\.docx$/i.test(source.name)) { throw new Error("Missing/invalid Front Note DOCX: " + source.fsName); }
        if (!/^[a-z][a-z0-9_]*$/.test(articleId)) { throw new Error("Invalid Front Note article id"); }
        if (typeof tokens.text_width_mm !== "number" || tokens.text_width_mm < 112 || tokens.text_width_mm > 122) { throw new Error("Invalid Front Note text width"); }
        this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Front Note requires a fresh document"); }
        doc.textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, doc.pages.item(0), articleId, 1, tokens);
        var story = this.importWord(first, source), before = story.contents;
        if (!before.length) { throw new Error("Front Note DOCX imported no text"); }
        story.label = "SHAN_FRONT_NOTE:" + articleId + ":story";
        var counts = this.mapStory(doc, story, options.hasSignature === true);
        var pages = this.flow(doc, story, first, articleId, tokens);
        if (story.contents !== before) { throw new Error("Front Note visible text changed during layout"); }
        doc.insertLabel("SHAN_FRONT_NOTE_REPORT", "article=" + articleId + "; pages=" + pages +
            "; body=" + counts.body + "; signature=" + counts.signature + "; overset=" + story.overflows + "; text unchanged=true");
        return { story: story, pages: pages, counts: counts, overset: story.overflows };
    }
};
