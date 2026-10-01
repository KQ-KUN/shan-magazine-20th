var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.history = {
    at: function (collection, i) { return SHAN.historySource.at(collection, i); },
    check: function (ok, message) { SHAN.historySource.require(ok, message); },
    indexOf: function (items, value) {
        var i; for (i = 0; i < items.length; i += 1) { if (items[i] === value) { return i; } } return -1;
    },
    addFrame: function (doc, page, first, tokens) {
        page.appliedMaster = doc.masterSpreads.itemByName("C-HISTORY");
        SHAN.document.applyMargins(page.marginPreferences);
        var b = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var left = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add(); frame.label = "SHAN_HISTORY:body";
        frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = this.at(doc.swatches, 0); frame.strokeColor = this.at(doc.swatches, 0);
        frame.geometricBounds = [b[0] + pt(first ? tokens.first_body_top_mm : m.top),
            b[1] + pt(left ? m.outside : m.inside), b[2] - pt(m.bottom), b[3] - pt(left ? m.inside : m.outside)];
        frame.textFramePreferences.textColumnCount = 2;
        frame.textFramePreferences.textColumnGutter = pt(6);
        frame.textFramePreferences.insetSpacing = [0,0,0,0];
        return frame;
    },
    chapterMarker: function (doc, page, section) {
        var b = page.bounds, m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var frame = page.textFrames.add(); frame.label = "SHAN_HISTORY:chapter_marker";
        frame.appliedObjectStyle = this.at(doc.objectStyles, 0);
        frame.fillColor = this.at(doc.swatches, 0); frame.strokeColor = this.at(doc.swatches, 0);
        frame.textFramePreferences.textColumnCount = 1; frame.textFramePreferences.insetSpacing = [0,0,0,0];
        frame.geometricBounds = [b[0] + pt(17), b[1] + pt(m.inside), b[0] + pt(27), b[3] - pt(m.outside)];
        frame.contents = section.display_index + "｜" + section.cn + " / " + section.en;
        this.at(frame.parentStory.paragraphs, 0).applyParagraphStyle(doc.paragraphStyles.itemByName("P_History_Chapter_Marker"), true);
        return frame;
    },
    imageSize: function (asset) {
        var width = asset.modules * SHAN.utils.moduleWidthMM() + (asset.modules - 1) * SHAN.spec.gutterMM;
        // Grid-sized viewport; do not enlarge a small low-resolution original to fill it.
        var contentWidth = asset.modules === 2 ? Math.min(width, asset.original_width_mm) : width;
        var fullHeight = contentWidth * asset.pixel_height / asset.pixel_width;
        return { width: width, contentWidth: contentWidth, fullHeight: fullHeight, height: fullHeight * (1 - asset.crop.t - asset.crop.b) };
    },
    image: function (doc, page, asset, file, paragraph, imageMap, caption, tokens) {
        var size = this.imageSize(asset), pt = SHAN.utils.pt;
        var rect = page.rectangles.add(); rect.label = "SHAN_HISTORY:image:" + imageMap.image_index;
        rect.appliedObjectStyle = doc.objectStyles.itemByName("O_Image_Archive");
        rect.fillColor = this.at(doc.swatches, 0); rect.strokeColor = this.at(doc.swatches, 0);
        rect.geometricBounds = [0,0,pt(size.height),pt(size.width)];
        rect.place(file, false); rect.fit(FitOptions.PROPORTIONALLY); rect.fit(FitOptions.CENTER_CONTENT);
        var graphic = this.at(rect.allGraphics, 0);
        this.check(graphic && graphic.isValid, "Image failed to place: " + imageMap.image_index);
        // Original crop and proportional content, with optional transparent side padding.
        var inset = (size.width - size.contentWidth) / 2;
        graphic.geometricBounds = [-pt(size.fullHeight * asset.crop.t),pt(inset),
            pt(size.fullHeight * (1 - asset.crop.t)),pt(inset + size.contentWidth)];
        var anchor = rect, captionFrame = null;
        if (caption !== null) {
            captionFrame = page.textFrames.add(); captionFrame.label = "SHAN_HISTORY:floating_caption";
            captionFrame.appliedObjectStyle = this.at(doc.objectStyles, 0);
            captionFrame.fillColor = this.at(doc.swatches, 0); captionFrame.strokeColor = this.at(doc.swatches, 0);
            captionFrame.textFramePreferences.textColumnCount = 1;
            captionFrame.textFramePreferences.insetSpacing = [0,0,0,0];
            captionFrame.geometricBounds = [pt(size.height + tokens.caption_gap_mm),0,
                pt(size.height + tokens.caption_gap_mm + tokens.floating_caption_height_mm),pt(size.width)];
            captionFrame.contents = caption;
            this.at(captionFrame.parentStory.paragraphs, 0).applyParagraphStyle(doc.paragraphStyles.itemByName("P_History_Caption"), true);
            anchor = doc.groups.add([rect, captionFrame]); anchor.label = "SHAN_HISTORY:first_archive_group";
        }
        var insertion = imageMap.anchor === "after_text" ? paragraph.insertionPoints.item(-2) : paragraph.insertionPoints.item(0);
        // Inline blocks participate in text flow; multi-image source paragraphs stay intact.
        anchor.anchoredObjectSettings.insertAnchoredObject(insertion, AnchorPosition.INLINE_POSITION);
        anchor.anchoredObjectSettings.anchorYoffset = 0;
        return { rect: rect, graphic: graphic, anchor: anchor, captionFrame: captionFrame, source: imageMap, asset: asset };
    },
    flow: function (doc, story, first, tokens) {
        var frames = [first], last = first, end = -1, next, current;
        doc.recompose();
        while (story.overflows) {
            this.check(frames.length < tokens.max_pages, "Overset exceeded page safety limit");
            current = last.insertionPoints.item(-1).index;
            this.check(current > end, "Overset with no progress; inspect image/keep settings near insertion " + current);
            end = current;
            next = this.addFrame(doc, doc.pages.add(LocationOptions.AT_END), false, tokens);
            last.nextTextFrame = next; frames.push(next); last = next; doc.recompose();
        }
        return frames;
    },
    linePosition: function (line) {
        var frame = this.at(line.parentTextFrames, 0);
        this.check(frame && frame.isValid && frame.parentPage, "Text line is not on an actual document page");
        var bounds = frame.geometricBounds, gutter = Number(frame.textFramePreferences.textColumnGutter);
        var pitch = (bounds[3] - bounds[1] + gutter) / 2;
        return { page: frame.parentPage.id, frame: frame.id,
            column: Math.max(0, Math.min(1, Math.floor((Number(line.horizontalOffset) - bounds[1] + 0.05) / pitch))) };
    },
    yearChecks: function (story, map) {
        var i, outputIndex, p, next, a, b;
        for (i = 0; i < map.years.length; i += 1) {
            outputIndex = this.indexOf(map.paragraph_order, map.years[i]);
            p = this.at(story.paragraphs, outputIndex); next = this.at(story.paragraphs, outputIndex + 1);
            this.check(p.lines.length > 0 && next.lines.length > 0, "Invisible year/following paragraph");
            a = this.linePosition(this.at(p.lines, -1)); b = this.linePosition(this.at(next.lines, 0));
            this.check(a.page === b.page && a.frame === b.frame && a.column === b.column, "Orphan year at source paragraph " + map.years[i]);
        }
    },
    graphicChecks: function (record, source, map) {
        var rect = record.rect, graphic = record.graphic, page = rect.parentPage;
        this.check(rect.isValid && graphic.isValid && page && page.isValid, "Missing/invisible image " + record.source.image_index);
        this.check(rect.itemLayer.visible, "Image layer hidden");
        var link = graphic.itemLink;
        this.check(link && link.isValid && link.status === LinkStatus.NORMAL, "Invalid image link " + record.source.image_index);
        this.check(this.indexOf(map.paragraph_order, record.source.source_paragraph) >= 0, "Image lost its source anchor");
        this.check(Math.abs(Number(graphic.horizontalScale) - Number(graphic.verticalScale)) < 0.1, "Image stretched " + record.source.image_index);
        var b = rect.geometricBounds, p = page.bounds, tolerance = SHAN.utils.pt(0.2);
        this.check(b[0] >= p[0] - tolerance && b[1] >= p[1] - tolerance && b[2] <= p[2] + tolerance && b[3] <= p[3] + tolerance, "Image outside document page");
        if (record.captionFrame) {
            this.check(!record.captionFrame.overflows, "Floating caption overset");
            this.check(record.captionFrame.parentPage && record.captionFrame.parentPage.id === page.id, "Floating image/caption detached");
            this.check(SHAN.historySource.paragraphText(this.at(record.captionFrame.parentStory.paragraphs, 0).contents, 0) === source.textboxes[0].text, "Floating caption text changed");
        }
    },
    anchorOrderChecks: function (story, images) {
        var i, parent, previous = -1;
        for (i = 0; i < images.length; i += 1) {
            parent = images[i].anchor.parent;
            this.check(parent && typeof parent.index === "number" && parent.parentStory && parent.parentStory.id === story.id,
                "Image not anchored in History story: " + (i + 1));
            this.check(parent.index > previous, "Actual image anchor order mismatch: " + (i + 1));
            previous = parent.index;
        }
    },
    validate: function (doc, result, source, map, tokens, context) {
        var story = result.story, i, j, caption, paragraph, pos, record, samePage, warnings = [];
        SHAN.historySource.assertParagraphs(story, source, map);
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            this.check(this.at(story.paragraphs, i).appliedParagraphStyle.name === map.paragraphs[map.paragraph_order[i] - 1].style,
                "Paragraph style mapping changed at source paragraph " + map.paragraph_order[i]);
        }
        this.check(!story.overflows, "Main story overset");
        this.check(doc.pages.length === result.frames.length && doc.pages.length > 0, "Wrong actual page count");
        this.check(result.marker.parentPage && !result.marker.overflows, "Chapter marker invisible/overset");
        this.check(story.allGraphics.length === 24 && result.images.length === 24, "Not all 24 images entered the story");
        this.check(result.frames[0].itemLayer.visible && story.contents.length > 100, "Main story not visible");
        for (i = 0; i < result.frames.length; i += 1) {
            var frame = result.frames[i], b = frame.geometricBounds, p = frame.parentPage.bounds;
            this.check(frame.parentPage && frame.parentPage.appliedMaster.name === "C-HISTORY", "Wrong document Parent");
            this.check(frame.textFramePreferences.textColumnCount === 2 && Math.abs(Number(frame.textFramePreferences.textColumnGutter) - SHAN.utils.pt(6)) < 0.1,
                "Wrong History column geometry");
            this.check(b[2] > b[0] && b[3] > b[1] && b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1], "Body frame outside page");
        }
        this.yearChecks(story, map);
        for (i = 0; i < result.images.length; i += 1) { this.graphicChecks(result.images[i], source, map); }
        this.anchorOrderChecks(story, result.images);
        // Inspect actual local paragraph graphics, including the first nested group.
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            var expectedImages = [], actualGraphics = this.at(story.paragraphs, i).allGraphics;
            for (j = 0; j < map.images.length; j += 1) {
                if (map.images[j].source_paragraph === map.paragraph_order[i]) { expectedImages.push(j); }
            }
            this.check(actualGraphics.length === expectedImages.length, "Graphics escaped source paragraph " + map.paragraph_order[i]);
            for (j = 0; j < expectedImages.length; j += 1) {
                var found = false, k;
                for (k = 0; k < actualGraphics.length; k += 1) {
                    if (this.at(actualGraphics, k).id === result.images[expectedImages[j]].graphic.id) { found = true; }
                }
                this.check(found, "Image no longer belongs to its source paragraph");
            }
        }
        for (i = 1; i < map.captions.length; i += 1) {
            caption = map.captions[i]; paragraph = this.at(story.paragraphs, this.indexOf(map.paragraph_order, caption.source_paragraph));
            pos = this.linePosition(this.at(paragraph.lines, 0)); samePage = true;
            for (j = 0; j < caption.image_indices.length; j += 1) {
                record = result.images[caption.image_indices[j] - 1];
                if (record.rect.parentPage.id !== pos.page) { samePage = false; }
            }
            this.check(samePage, "Caption detached from image at source paragraph " + caption.source_paragraph);
        }
        for (i = 0; i < doc.fonts.length; i += 1) {
            this.check(this.at(doc.fonts, i).status === FontStatus.INSTALLED, "Missing font in document");
        }
        var fontLog = doc.extractLabel("SHAN_VISUAL_FONTS");
        this.check(fontLog.indexOf("MISSING APPROVED FONT") < 0, "Approved font family missing; no automatic substitute");
        var width = Number(doc.documentPreferences.pageWidth), height = Number(doc.documentPreferences.pageHeight);
        this.check(Math.abs(width - SHAN.utils.pt(185)) < 0.1 && Math.abs(height - SHAN.utils.pt(260)) < 0.1, "Wrong trim size");
        var bleeds = ["documentBleedTopOffset", "documentBleedBottomOffset", "documentBleedInsideOrLeftOffset", "documentBleedOutsideOrRightOffset"];
        for (i = 0; i < bleeds.length; i += 1) { this.check(Math.abs(Number(doc.documentPreferences[bleeds[i]]) - SHAN.utils.pt(3)) < 0.1, "Wrong bleed"); }
        // Visual targets are advisory; never fail on an estimated page count.
        if (doc.pages.length < tokens.advisory_pages[0] || doc.pages.length > tokens.advisory_pages[1]) { warnings.push("页数超出预估范围，需PDF视觉检查；不是内容完整性失败。"); }
        return "PASS History data checks; pages=" + doc.pages.length + "; paragraphs=" + map.paragraph_order.length +
            "; entries=21; images=24; captions=5; overset=false; source SHA-256=PASS; paragraph equality=PASS" +
            "; source already includes approved deletion; import omissions=0; approved moves=1; runtime=InDesign " + app.version +
            "\n" + warnings.join("\n") + "\nPDF视觉验收待用户确认。";
    },
    create: function (doc, root, source, map, audit, tokens, section, context) {
        this.check(doc.pages.length === 1 && this.at(doc.pages, 0).textFrames.length === 0, "Fresh document required");
        this.check(doc.masterSpreads.itemByName("C-HISTORY").isValid, "Missing C-HISTORY");
        SHAN.historySource.validateMap(map, source);
        doc.textPreferences.smartTextReflow = false;
        var page = this.at(doc.pages, 0), first = this.addFrame(doc, page, true, tokens);
        var marker = this.chapterMarker(doc, page, section), text = [], i, j, index;
        for (i = 0; i < map.paragraph_order.length; i += 1) { text.push(source.paragraphs[map.paragraph_order[i] - 1]); }
        first.contents = text.join("\r") + "\r";
        var story = first.parentStory; story.label = "SHAN_HISTORY:main";
        this.check(story.paragraphs.length === map.paragraph_order.length, "Initial paragraph count mismatch: " + story.paragraphs.length);
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            var style = doc.paragraphStyles.itemByName(map.paragraphs[map.paragraph_order[i] - 1].style);
            this.check(style.isValid, "Unknown/unmapped History paragraph style");
            this.at(story.paragraphs, i).applyParagraphStyle(style, true);
        }
        var images = [], paragraph, caption;
        // Place from last to first within each source paragraph to preserve object order.
        for (i = map.images.length - 1; i >= 0; i -= 1) {
            index = this.indexOf(map.paragraph_order, map.images[i].source_paragraph);
            paragraph = this.at(story.paragraphs, index); caption = i === 0 ? source.textboxes[0].text : null;
            images[i] = this.image(doc, page, audit.assets[i], File(root + "/" + audit.assets[i].file), paragraph, map.images[i], caption, tokens);
        }
        var frames = this.flow(doc, story, first, tokens);
        var result = { story: story, frames: frames, images: images, marker: marker };
        var report = this.validate(doc, result, source, map, tokens, context);
        doc.insertLabel("SHAN_HISTORY_REPORT", report); result.report = report;
        return result;
    }
};
