var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.feature = {
    styleMap: {
        ArticleTitle: "P_Article_Title", Author: "P_Author",
        FeatureLead: "P_Feature_Lead", FeatureSection: "P_Feature_Section",
        Body: "P_Feature_Body", FeatureMedia: "P_Feature_Media",
        Caption: "P_Feature_Caption", caption: "P_Feature_Caption"
    },
    checkStyles: function (doc) {
        var name;
        for (name in this.styleMap) {
            if (this.styleMap.hasOwnProperty(name) && !doc.paragraphStyles.itemByName(this.styleMap[name]).isValid) {
                throw new Error("Missing InDesign style: " + this.styleMap[name]);
            }
        }
        if (!doc.masterSpreads.itemByName("A-TEXT").isValid) { throw new Error("Missing A-TEXT Parent"); }
        if (!doc.objectStyles.itemByName("O_Text_Main").isValid) { throw new Error("Missing O_Text_Main style"); }
    },
    addFrame: function (doc, page, articleId, index) {
        page.appliedMaster = doc.masterSpreads.itemByName("A-TEXT");
        SHAN.document.applyMargins(page.marginPreferences);
        var bounds = page.bounds, margins = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var isLeft = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add();
        frame.label = "SHAN_FEATURE:" + articleId + ":frame:" + index;
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
            preferences.removeFormatting = false; preferences.importUnusedStyles = false;
            preferences.preserveGraphics = false; preferences.useTypographersQuotes = false;
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
            if (!this.styleMap.hasOwnProperty(sourceName)) { throw new Error("Unknown Word style: " + sourceName + " (paragraph " + (i + 1) + ")"); }
            targets.push(doc.paragraphStyles.itemByName(this.styleMap[sourceName]));
            if (!targets[i].isValid) { throw new Error("Missing InDesign style: " + this.styleMap[sourceName]); }
            counts[sourceName] = (counts[sourceName] || 0) + 1;
        }
        for (i = 0; i < targets.length; i += 1) { story.paragraphs.item(i).applyParagraphStyle(targets[i], true); }
        if (story.contents !== before) { throw new Error("Feature text changed during style mapping"); }
        return counts;
    },
    textOnly: function (value) { return String(value).replace(/\uFFFC/g, ""); },
    withoutMarkers: function (value, media) {
        var i, marker, parts, result = String(value);
        for (i = 0; i < media.length; i += 1) {
            marker = "[[" + media[i].slot + "]]"; parts = result.split(marker);
            if (parts.length !== 2) { throw new Error("Expected exactly one Feature media marker: " + media[i].slot); }
            result = parts.join("");
        }
        return result;
    },
    placeMedia: function (doc, story, media) {
        var i, j, item, marker, paragraph, at, matches, placements = [], rect;
        for (i = 0; i < media.length; i += 1) {
            item = media[i]; marker = "[[" + item.slot + "]]"; matches = 0; paragraph = null; at = -1;
            if (!item.file || item.align !== "CENTER") { throw new Error("Invalid Feature media manifest: " + item.slot); }
            for (j = 0; j < story.paragraphs.length; j += 1) {
                if (story.paragraphs.item(j).appliedParagraphStyle.name === "P_Feature_Media") {
                    var found = story.paragraphs.item(j).contents.indexOf(marker);
                    if (found >= 0) { matches += 1; paragraph = story.paragraphs.item(j); at = found; }
                }
            }
            if (matches !== 1) { throw new Error("Expected one styled Feature media marker: " + item.slot + "; found " + matches); }
            placements.push({ item: item, marker: marker, paragraph: paragraph, at: at });
        }
        for (i = 0; i < placements.length; i += 1) {
            item = placements[i].item; paragraph = placements[i].paragraph; at = placements[i].at;
            paragraph.characters.itemByRange(at, at + placements[i].marker.length - 1).remove();
            var mediaFile = File(item.file);
            if (!mediaFile.exists) { throw new Error("Missing Feature media asset: " + item.slot); }
            rect = doc.pages.item(0).rectangles.add();
            rect.label = "SHAN_FEATURE_MEDIA:" + item.slot;
            rect.fillColor = doc.swatches.item(0); rect.strokeColor = doc.swatches.item(0);
            rect.geometricBounds = [0, 0, SHAN.utils.pt(item.height_mm), SHAN.utils.pt(item.width_mm)];
            rect.place(mediaFile, false); rect.fit(FitOptions.PROPORTIONALLY); rect.fit(FitOptions.CENTER_CONTENT);
            rect.anchoredObjectSettings.insertAnchoredObject(paragraph.insertionPoints.item(0), AnchorPosition.ABOVE_LINE);
            rect.anchoredObjectSettings.horizontalAlignment = HorizontalAlignment.CENTER_ALIGN;
            rect.anchoredObjectSettings.anchorSpaceAbove = 0; rect.anchoredObjectSettings.anchorYoffset = 0;
        }
        doc.recompose(); return placements.length;
    },
    flow: function (doc, story, first, articleId) {
        var last = first, next, pages = 1, lastEnd = -1, end;
        doc.recompose();
        while (story.overflows) {
            end = last.insertionPoints.item(-1).index;
            if (end <= lastEnd) { throw new Error("Feature overset remains: no text-flow progress after " + pages + " pages"); }
            lastEnd = end; next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), articleId, pages + 1);
            last.nextTextFrame = next; last = next; pages += 1; doc.recompose();
        }
        return pages;
    },
    create: function (doc, source, articleId, manifest, root) {
        if (!source.exists || !/\.docx$/i.test(source.name)) { throw new Error("Missing/invalid Feature DOCX: " + source.fsName); }
        if (!/^[a-z][a-z0-9_]*$/.test(articleId) || manifest.article_id !== articleId || !(manifest.media instanceof Array)) { throw new Error("Invalid Feature contract"); }
        this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Feature requires a fresh document"); }
        doc.textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, doc.pages.item(0), articleId, 1);
        var story = this.importWord(first, source);
        if (!story.contents.length) { throw new Error("Feature DOCX imported no text"); }
        story.label = "SHAN_FEATURE:" + articleId + ":story";
        var sourceText = this.textOnly(story.contents), expectedText = this.withoutMarkers(sourceText, manifest.media);
        var counts = this.mapStory(doc, story), media = [], i;
        if ((counts.FeatureMedia || 0) !== manifest.media.length) { throw new Error("Feature media paragraph count mismatch"); }
        for (i = 0; i < manifest.media.length; i += 1) {
            media.push({ slot: manifest.media[i].slot, file: root + "/" + manifest.media[i].file,
                width_mm: manifest.media[i].width_mm, height_mm: manifest.media[i].height_mm, align: manifest.media[i].align });
        }
        var placed = this.placeMedia(doc, story, media);
        if (this.textOnly(story.contents) !== expectedText) { throw new Error("Feature visible text changed while placing media"); }
        var pages = this.flow(doc, story, first, articleId);
        if (this.textOnly(story.contents) !== expectedText) { throw new Error("Feature visible text changed during flow"); }
        doc.insertLabel("SHAN_FEATURE_REPORT", "article=" + articleId + "; pages=" + pages + "; sections=" + (counts.FeatureSection || 0) + "; media=" + placed + "; captions=" + ((counts.Caption || 0) + (counts.caption || 0)) + "; overset=" + story.overflows + "; text unchanged except markers=true");
        return { story: story, pages: pages, counts: counts, media: placed, graphics: story.allGraphics.length, overset: story.overflows };
    }
};
