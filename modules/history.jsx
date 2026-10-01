var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.history = {
    runtime: null,
    at: function (collection, i) { return SHAN.historySource.at(collection, i); },
    check: function (ok, message) {
        var r = this.runtime, prefix = "";
        if (r && r.image_index !== null && r.image_index !== undefined) {
            prefix = "History image " + r.image_index + " / source paragraph " + r.source_paragraph + " / anchor " + r.anchor + ": ";
        } else if (r && r.source_paragraph !== null && r.source_paragraph !== undefined) {
            prefix = "source paragraph " + r.source_paragraph + ": ";
        }
        SHAN.historySource.require(ok, prefix + message);
    },
    stage: function (name, detail) {
        if (this.runtime && typeof this.runtime.setStage === "function") { this.runtime.setStage(name, detail); }
    },
    describe: function (detail) {
        if (!this.runtime) { return; }
        var key; for (key in detail) { if (detail.hasOwnProperty(key)) { this.runtime[key] = detail[key]; } }
    },
    valid: function (value, label) {
        this.check(value !== undefined && value !== null && value.isValid !== false, "missing/invalid " + label);
        return value;
    },
    field: function (object, key, label) {
        object = this.valid(object, label || "DOM object");
        return this.valid(object[key], (label || "DOM object") + "." + key);
    },
    domAt: function (collection, index, label) {
        collection = this.valid(collection, label);
        this.check(typeof collection.length === "number", "missing collection length: " + label);
        return this.valid(this.at(collection, index), label + "[" + index + "]");
    },
    named: function (doc, collectionName, name) {
        var collection = this.field(doc, collectionName, "document");
        this.check(typeof collection.itemByName === "function", "missing itemByName: " + collectionName);
        return this.valid(collection.itemByName(name), collectionName + ":" + name);
    },
    paragraph: function (story, index, label) {
        var paragraphs = this.field(story, "paragraphs", "History story");
        return this.domAt(paragraphs, index, label || "History paragraph");
    },
    graphicsOf: function (object, label) {
        object = this.valid(object, label);
        var graphics = object.allGraphics;
        if (graphics === undefined || graphics === null) { graphics = object.graphics; }
        graphics = this.valid(graphics, label + " graphics");
        this.check(typeof graphics.length === "number", "missing graphics count: " + label);
        return graphics;
    },
    insertion: function (paragraph, anchorMode) {
        paragraph = this.valid(paragraph, "image paragraph");
        var points = this.field(paragraph, "insertionPoints", "image paragraph");
        this.check(typeof points.length === "number" && points.length > 0, "missing insertion point");
        var index = 0;
        if (anchorMode === "after_text") {
            var contents = String(this.field(paragraph, "contents", "image paragraph"));
            // Resolve a POSITIVE index from the current paragraph, not a cached item(-2).
            var hasDelimiter = contents.charAt(contents.length - 1) === "\r";
            index = points.length - (hasDelimiter ? 2 : 1);
            this.check(index >= 0 && index < points.length, "missing insertion point before paragraph delimiter");
        } else { this.check(anchorMode === "paragraph_start", "unsupported anchor mode"); }
        return this.domAt(points, index, "image insertion point");
    },
    indexOf: function (items, value) {
        var i; for (i = 0; i < items.length; i += 1) { if (items[i] === value) { return i; } } return -1;
    },
    addFrame: function (doc, page, first, tokens) {
        this.describe({ frame_label: "SHAN_HISTORY:body", operation: "create body frame" });
        page = this.valid(page, "document page");
        page.appliedMaster = this.named(doc, "masterSpreads", "C-HISTORY");
        SHAN.document.applyMargins(this.field(page, "marginPreferences", "page"));
        var b = this.field(page, "bounds", "page"), m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var left = page.side === PageSideOptions.LEFT_HAND;
        var textFrames = this.field(page, "textFrames", "page");
        this.check(typeof textFrames.add === "function", "missing body textFrames.add");
        var frame = this.valid(textFrames.add(), "new body frame"); frame.label = "SHAN_HISTORY:body";
        frame.appliedObjectStyle = this.named(doc, "objectStyles", "O_Text_Main");
        var none = this.domAt(this.field(doc, "swatches", "document"), 0, "swatches");
        frame.fillColor = none; frame.strokeColor = none;
        frame.geometricBounds = [b[0] + pt(first ? tokens.first_body_top_mm : m.top),
            b[1] + pt(left ? m.outside : m.inside), b[2] - pt(m.bottom), b[3] - pt(left ? m.inside : m.outside)];
        var framePreferences = this.field(frame, "textFramePreferences", "body frame");
        framePreferences.textColumnCount = 2;
        framePreferences.textColumnGutter = pt(6);
        framePreferences.insetSpacing = [0,0,0,0];
        return frame;
    },
    chapterMarker: function (doc, page, section) {
        this.describe({ frame_label: "SHAN_HISTORY:chapter_marker", operation: "create chapter marker" });
        var b = this.field(page, "bounds", "chapter page"), m = SHAN.spec.marginsMM, pt = SHAN.utils.pt;
        var textFrames = this.field(page, "textFrames", "chapter page");
        this.check(typeof textFrames.add === "function", "missing chapter textFrames.add");
        var frame = this.valid(textFrames.add(), "chapter marker frame"); frame.label = "SHAN_HISTORY:chapter_marker";
        frame.appliedObjectStyle = this.domAt(this.field(doc, "objectStyles", "document"), 0, "object styles");
        var none = this.domAt(this.field(doc, "swatches", "document"), 0, "swatches");
        frame.fillColor = none; frame.strokeColor = none;
        var framePreferences = this.field(frame, "textFramePreferences", "chapter marker");
        framePreferences.textColumnCount = 1; framePreferences.insetSpacing = [0,0,0,0];
        frame.geometricBounds = [b[0] + pt(17), b[1] + pt(m.inside), b[0] + pt(27), b[3] - pt(m.outside)];
        frame.contents = section.display_index + "｜" + section.cn + " / " + section.en;
        var markerStory = this.field(frame, "parentStory", "chapter marker");
        var markerParagraph = this.paragraph(markerStory, 0, "chapter marker paragraph");
        this.check(typeof markerParagraph.applyParagraphStyle === "function", "missing chapter paragraph.applyParagraphStyle");
        markerParagraph.applyParagraphStyle(this.named(doc, "paragraphStyles", "P_History_Chapter_Marker"), true);
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
        this.stage("history-create:image-" + imageMap.image_index, { image_index: imageMap.image_index,
            source_paragraph: imageMap.source_paragraph, anchor: imageMap.anchor, operation: "create rectangle" });
        var size = this.imageSize(asset), pt = SHAN.utils.pt;
        paragraph = this.valid(paragraph, "image paragraph before placement");
        var rectangles = this.field(page, "rectangles", "image page");
        this.check(typeof rectangles.add === "function", "missing rectangles.add");
        var rect = this.valid(rectangles.add(), "new image rectangle"); rect.label = "SHAN_HISTORY:image:" + imageMap.image_index;
        rect.appliedObjectStyle = this.named(doc, "objectStyles", "O_Image_Archive");
        var none = this.domAt(this.field(doc, "swatches", "document"), 0, "swatches");
        rect.fillColor = none; rect.strokeColor = none;
        rect.geometricBounds = [0,0,pt(size.height),pt(size.width)];
        this.describe({ operation: "place image bytes", frame_label: rect.label });
        this.check(typeof rect.place === "function" && typeof rect.fit === "function", "missing image rectangle place/fit method");
        rect.place(file, false); rect.fit(FitOptions.PROPORTIONALLY); rect.fit(FitOptions.CENTER_CONTENT);
        this.describe({ operation: "resolve placed graphic" });
        var graphic = this.domAt(this.graphicsOf(rect, "image rectangle"), 0, "placed graphic");
        // Original crop and proportional content, with optional transparent side padding.
        var inset = (size.width - size.contentWidth) / 2;
        graphic.geometricBounds = [-pt(size.fullHeight * asset.crop.t),pt(inset),
            pt(size.fullHeight * (1 - asset.crop.t)),pt(inset + size.contentWidth)];
        var anchor = rect, captionFrame = null;
        if (caption !== null) {
            this.describe({ operation: "create floating caption", frame_label: "SHAN_HISTORY:floating_caption" });
            var textFrames = this.field(page, "textFrames", "caption page");
            this.check(typeof textFrames.add === "function", "missing textFrames.add");
            captionFrame = this.valid(textFrames.add(), "floating caption frame"); captionFrame.label = "SHAN_HISTORY:floating_caption";
            captionFrame.appliedObjectStyle = this.domAt(this.field(doc, "objectStyles", "document"), 0, "object styles");
            captionFrame.fillColor = none; captionFrame.strokeColor = none;
            var captionPreferences = this.field(captionFrame, "textFramePreferences", "caption frame");
            captionPreferences.textColumnCount = 1;
            captionPreferences.insetSpacing = [0,0,0,0];
            captionFrame.geometricBounds = [pt(size.height + tokens.caption_gap_mm),0,
                pt(size.height + tokens.caption_gap_mm + tokens.floating_caption_height_mm),pt(size.width)];
            captionFrame.contents = caption;
            var captionStory = this.field(captionFrame, "parentStory", "caption frame");
            var captionParagraph = this.paragraph(captionStory, 0, "caption paragraph");
            this.check(typeof captionParagraph.applyParagraphStyle === "function", "missing caption paragraph.applyParagraphStyle");
            captionParagraph.applyParagraphStyle(this.named(doc, "paragraphStyles", "P_History_Caption"), true);
            this.describe({ operation: "create floating caption group" });
            var groups = this.field(doc, "groups", "document");
            this.check(typeof groups.add === "function", "missing groups.add");
            anchor = this.valid(groups.add([rect, captionFrame]), "floating caption group");
            anchor.label = "SHAN_HISTORY:first_archive_group";
        }
        this.describe({ operation: "resolve current insertion point" });
        // Resolve immediately before insertion; never reuse an insertion point from a previous image.
        var insertion = this.insertion(paragraph, imageMap.anchor);
        var targetStory = this.field(insertion, "parentStory", "image insertion point");
        var settings = this.field(anchor, "anchoredObjectSettings", "image anchor");
        this.check(typeof settings.insertAnchoredObject === "function", "missing insertAnchoredObject");
        this.describe({ operation: "insert anchored object" });
        // Inline blocks participate in text flow; multi-image source paragraphs stay intact.
        settings.insertAnchoredObject(insertion, AnchorPosition.INLINE_POSITION);
        // Insertion may invalidate specifiers. Resolve both the anchor and its story again.
        this.describe({ operation: "verify objects after anchoring" });
        anchor = this.valid(anchor, "anchored rectangle/group");
        settings = this.field(anchor, "anchoredObjectSettings", "anchored image"); settings.anchorYoffset = 0;
        var parent = this.field(anchor, "parent", "anchored image");
        var parentStory = this.field(parent, "parentStory", "anchor character");
        this.check(parentStory.id === targetStory.id, "anchor changed parentStory");
        this.valid(rect, "rectangle after anchoring"); this.valid(graphic, "graphic after anchoring");
        if (captionFrame) { this.valid(captionFrame, "caption frame after anchoring"); }
        return { rect: rect, graphic: graphic, anchor: anchor, captionFrame: captionFrame, source: imageMap, asset: asset };
    },
    flow: function (doc, story, first, tokens) {
        this.valid(doc, "flow document"); this.valid(story, "flow story"); this.valid(first, "first flow frame");
        var frames = [first], last = first, end = -1, next, current;
        doc.recompose();
        while (story.overflows) {
            this.check(frames.length < tokens.max_pages, "Overset exceeded page safety limit");
            this.describe({ frame_label: last.label, operation: "resolve flow end insertion point" });
            var points = this.field(last, "insertionPoints", "last body frame");
            var point = this.domAt(points, -1, "flow insertion point");
            current = point.index;
            this.check(current > end, "Overset with no progress; inspect image/keep settings near insertion " + current);
            end = current;
            var pages = this.field(doc, "pages", "flow document");
            this.check(typeof pages.add === "function", "missing document.pages.add");
            var page = this.valid(pages.add(LocationOptions.AT_END), "new flow page");
            next = this.addFrame(doc, page, false, tokens);
            last.nextTextFrame = next; frames.push(next); last = next; doc.recompose();
        }
        return frames;
    },
    linePosition: function (line) {
        var parentFrames = this.field(line, "parentTextFrames", "text line");
        var frame = this.domAt(parentFrames, 0, "line parent frame");
        var page = this.field(frame, "parentPage", "line parent frame");
        var bounds = this.field(frame, "geometricBounds", "line frame");
        var preferences = this.field(frame, "textFramePreferences", "line frame");
        var gutter = Number(preferences.textColumnGutter);
        var pitch = (bounds[3] - bounds[1] + gutter) / 2;
        return { page: page.id, frame: frame.id,
            column: Math.max(0, Math.min(1, Math.floor((Number(line.horizontalOffset) - bounds[1] + 0.05) / pitch))) };
    },
    yearChecks: function (story, map) {
        var i, outputIndex, p, next, a, b;
        for (i = 0; i < map.years.length; i += 1) {
            outputIndex = this.indexOf(map.paragraph_order, map.years[i]);
            this.describe({ source_paragraph: map.years[i], operation: "validate year and following lines" });
            p = this.paragraph(story, outputIndex, "year paragraph"); next = this.paragraph(story, outputIndex + 1, "following paragraph");
            var lines = this.field(p, "lines", "year paragraph"), nextLines = this.field(next, "lines", "following paragraph");
            this.check(lines.length > 0 && nextLines.length > 0, "Invisible year/following paragraph");
            a = this.linePosition(this.domAt(lines, -1, "year lines")); b = this.linePosition(this.domAt(nextLines, 0, "following lines"));
            this.check(a.page === b.page && a.frame === b.frame && a.column === b.column, "Orphan year at source paragraph " + map.years[i]);
        }
    },
    graphicChecks: function (record, source, map) {
        this.valid(record, "image record");
        var imageMap = this.valid(record.source, "image record mapping");
        this.describe({ image_index: imageMap.image_index, source_paragraph: imageMap.source_paragraph,
            anchor: imageMap.anchor, operation: "validate composed image" });
        var rect = this.valid(record.rect, "image rectangle"), graphic = this.valid(record.graphic, "placed graphic");
        var page = this.field(rect, "parentPage", "image rectangle");
        var layer = this.field(rect, "itemLayer", "image rectangle");
        this.check(layer.visible, "Image layer hidden");
        var link = this.field(graphic, "itemLink", "placed graphic");
        this.check(link.status === LinkStatus.NORMAL, "Invalid image link " + imageMap.image_index);
        this.check(this.indexOf(map.paragraph_order, imageMap.source_paragraph) >= 0, "Image lost its source anchor");
        this.check(Math.abs(Number(graphic.horizontalScale) - Number(graphic.verticalScale)) < 0.1, "Image stretched " + imageMap.image_index);
        var b = this.field(rect, "geometricBounds", "image rectangle"), p = this.field(page, "bounds", "image page"), tolerance = SHAN.utils.pt(0.2);
        this.check(b[0] >= p[0] - tolerance && b[1] >= p[1] - tolerance && b[2] <= p[2] + tolerance && b[3] <= p[3] + tolerance, "Image outside document page");
        if (record.captionFrame) {
            var captionFrame = this.valid(record.captionFrame, "floating caption frame");
            this.check(!captionFrame.overflows, "Floating caption overset");
            var captionPage = this.field(captionFrame, "parentPage", "floating caption");
            this.check(captionPage.id === page.id, "Floating image/caption detached");
            var captionStory = this.field(captionFrame, "parentStory", "floating caption");
            var captionParagraph = this.paragraph(captionStory, 0, "floating caption paragraph");
            this.check(SHAN.historySource.paragraphText(captionParagraph.contents, 0) === source.textboxes[0].text, "Floating caption text changed");
        }
    },
    anchorOrderChecks: function (story, images) {
        var i, parent, previous = -1;
        for (i = 0; i < images.length; i += 1) {
            var record = this.valid(images[i], "image record " + (i + 1));
            this.describe({ image_index: i + 1, source_paragraph: record.source ? record.source.source_paragraph : null,
                anchor: record.source ? record.source.anchor : null, operation: "validate anchor order" });
            var anchor = this.valid(record.anchor, "image anchor " + (i + 1));
            parent = this.field(anchor, "parent", "image anchor");
            var parentStory = this.field(parent, "parentStory", "anchor character");
            this.check(typeof parent.index === "number" && parentStory.id === story.id,
                "Image not anchored in History story: " + (i + 1));
            this.check(parent.index > previous, "Actual image anchor order mismatch: " + (i + 1));
            previous = parent.index;
        }
    },
    validate: function (doc, result, source, map, tokens, context) {
        this.valid(doc, "validation document"); this.valid(result, "History result");
        var story = this.valid(result.story, "validation story"), i, j, caption, paragraph, pos, record, samePage, warnings = [];
        SHAN.historySource.assertParagraphs(story, source, map, this.runtime);
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            this.describe({ source_paragraph: map.paragraph_order[i], operation: "validate paragraph style" });
            paragraph = this.paragraph(story, i, "style validation paragraph");
            var appliedStyle = this.field(paragraph, "appliedParagraphStyle", "paragraph");
            this.check(appliedStyle.name === map.paragraphs[map.paragraph_order[i] - 1].style,
                "Paragraph style mapping changed at source paragraph " + map.paragraph_order[i]);
        }
        this.check(!story.overflows, "Main story overset");
        var pages = this.field(doc, "pages", "validation document");
        var frames = this.valid(result.frames, "History frames"), images = this.valid(result.images, "History images");
        this.check(pages.length === frames.length && pages.length > 0, "Wrong actual page count");
        var marker = this.valid(result.marker, "chapter marker");
        this.field(marker, "parentPage", "chapter marker");
        this.check(!marker.overflows, "Chapter marker invisible/overset");
        this.check(this.graphicsOf(story, "History story").length === 24 && images.length === 24, "Not all 24 images entered the story");
        var firstFrame = this.domAt(frames, 0, "body frames"), bodyLayer = this.field(firstFrame, "itemLayer", "first body frame");
        var contents = this.field(story, "contents", "History story");
        this.check(bodyLayer.visible && contents.length > 100, "Main story not visible");
        for (i = 0; i < frames.length; i += 1) {
            var frame = this.domAt(frames, i, "body frames");
            this.describe({ frame_label: frame.label || "SHAN_HISTORY:body", operation: "validate body frame" });
            var b = this.field(frame, "geometricBounds", "body frame"), page = this.field(frame, "parentPage", "body frame");
            var p = this.field(page, "bounds", "body page"), parent = this.field(page, "appliedMaster", "body page");
            var preferences = this.field(frame, "textFramePreferences", "body frame");
            this.check(parent.name === "C-HISTORY", "Wrong document Parent");
            this.check(preferences.textColumnCount === 2 && Math.abs(Number(preferences.textColumnGutter) - SHAN.utils.pt(6)) < 0.1,
                "Wrong History column geometry");
            this.check(b[2] > b[0] && b[3] > b[1] && b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1], "Body frame outside page");
        }
        this.yearChecks(story, map);
        for (i = 0; i < images.length; i += 1) { this.graphicChecks(images[i], source, map); }
        this.anchorOrderChecks(story, images);
        // Inspect actual local paragraph graphics, including the first nested group.
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            this.describe({ image_index: null, anchor: null, source_paragraph: map.paragraph_order[i], operation: "validate local paragraph graphics" });
            paragraph = this.paragraph(story, i, "graphics validation paragraph");
            var expectedImages = [], actualGraphics = this.graphicsOf(paragraph, "source paragraph " + map.paragraph_order[i]);
            for (j = 0; j < map.images.length; j += 1) {
                if (map.images[j].source_paragraph === map.paragraph_order[i]) { expectedImages.push(j); }
            }
            this.check(actualGraphics.length === expectedImages.length, "Graphics escaped source paragraph " + map.paragraph_order[i]);
            for (j = 0; j < expectedImages.length; j += 1) {
                var found = false, k;
                for (k = 0; k < actualGraphics.length; k += 1) {
                    var actualGraphic = this.domAt(actualGraphics, k, "local paragraph graphics");
                    var expectedRecord = this.valid(images[expectedImages[j]], "expected image record");
                    var expectedGraphic = this.valid(expectedRecord.graphic, "expected graphic");
                    if (actualGraphic.id === expectedGraphic.id) { found = true; }
                }
                this.check(found, "Image no longer belongs to its source paragraph");
            }
        }
        for (i = 1; i < map.captions.length; i += 1) {
            caption = map.captions[i];
            this.describe({ source_paragraph: caption.source_paragraph, operation: "validate caption page" });
            paragraph = this.paragraph(story, this.indexOf(map.paragraph_order, caption.source_paragraph), "caption paragraph");
            var lines = this.field(paragraph, "lines", "caption paragraph");
            pos = this.linePosition(this.domAt(lines, 0, "caption lines")); samePage = true;
            for (j = 0; j < caption.image_indices.length; j += 1) {
                record = this.valid(images[caption.image_indices[j] - 1], "caption image record");
                var captionRect = this.valid(record.rect, "caption image rectangle");
                var captionImagePage = this.field(captionRect, "parentPage", "caption image rectangle");
                if (captionImagePage.id !== pos.page) { samePage = false; }
            }
            this.check(samePage, "Caption detached from image at source paragraph " + caption.source_paragraph);
        }
        this.describe({ image_index: null, source_paragraph: null, anchor: null, frame_label: null, operation: "validate document fonts" });
        var fonts = this.field(doc, "fonts", "validation document");
        for (i = 0; i < fonts.length; i += 1) {
            var font = this.domAt(fonts, i, "document fonts");
            this.check(font.status === FontStatus.INSTALLED, "Missing font in document");
        }
        var fontLog = doc.extractLabel("SHAN_VISUAL_FONTS");
        this.check(fontLog.indexOf("MISSING APPROVED FONT") < 0, "Approved font family missing; no automatic substitute");
        var documentPreferences = this.field(doc, "documentPreferences", "document");
        var width = Number(documentPreferences.pageWidth), height = Number(documentPreferences.pageHeight);
        this.check(Math.abs(width - SHAN.utils.pt(185)) < 0.1 && Math.abs(height - SHAN.utils.pt(260)) < 0.1, "Wrong trim size");
        var bleeds = ["documentBleedTopOffset", "documentBleedBottomOffset", "documentBleedInsideOrLeftOffset", "documentBleedOutsideOrRightOffset"];
        for (i = 0; i < bleeds.length; i += 1) { this.check(Math.abs(Number(documentPreferences[bleeds[i]]) - SHAN.utils.pt(3)) < 0.1, "Wrong bleed"); }
        // Visual targets are advisory; never fail on an estimated page count.
        if (pages.length < tokens.advisory_pages[0] || pages.length > tokens.advisory_pages[1]) { warnings.push("页数超出预估范围，需PDF视觉检查；不是内容完整性失败。"); }
        return "PASS History data checks; pages=" + pages.length + "; paragraphs=" + map.paragraph_order.length +
            "; entries=21; images=24; captions=5; overset=false; source SHA-256=PASS; paragraph equality=PASS" +
            "; source already includes approved deletion; import omissions=0; approved moves=1; runtime=InDesign " + app.version +
            "\n" + warnings.join("\n") + "\nPDF视觉验收待用户确认。";
    },
    create: function (doc, root, source, map, audit, tokens, section, context) {
        this.runtime = context && context.runtime ? context.runtime : null;
        this.stage("history-create:text", { operation: "initialise History story", frame_label: "SHAN_HISTORY:body" });
        var pages = this.field(doc, "pages", "History document");
        var page = this.domAt(pages, 0, "document pages");
        var textFrames = this.field(page, "textFrames", "first document page");
        this.check(pages.length === 1 && textFrames.length === 0, "Fresh document required");
        this.named(doc, "masterSpreads", "C-HISTORY");
        SHAN.historySource.validateMap(map, source);
        var textPreferences = this.field(doc, "textPreferences", "History document"); textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, page, true, tokens);
        var marker = this.chapterMarker(doc, page, section), text = [], i, j, index;
        for (i = 0; i < map.paragraph_order.length; i += 1) { text.push(source.paragraphs[map.paragraph_order[i] - 1]); }
        first.contents = text.join("\r") + "\r";
        var story = this.field(first, "parentStory", "first body frame"); story.label = "SHAN_HISTORY:main";
        var paragraphs = this.field(story, "paragraphs", "initial History story");
        this.check(paragraphs.length === map.paragraph_order.length, "Initial paragraph count mismatch: " + paragraphs.length);
        this.stage("history-create:styles", { operation: "apply paragraph style mappings", frame_label: "SHAN_HISTORY:body" });
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            this.describe({ source_paragraph: map.paragraph_order[i] });
            var style = this.named(doc, "paragraphStyles", map.paragraphs[map.paragraph_order[i] - 1].style);
            var styledParagraph = this.paragraph(story, i, "style mapping paragraph");
            this.check(typeof styledParagraph.applyParagraphStyle === "function", "missing source paragraph.applyParagraphStyle");
            styledParagraph.applyParagraphStyle(style, true);
        }
        var images = [], paragraph, caption;
        // Place from last to first within each source paragraph to preserve object order.
        for (i = map.images.length - 1; i >= 0; i -= 1) {
            this.stage("history-create:image-" + map.images[i].image_index, { image_index: map.images[i].image_index,
                source_paragraph: map.images[i].source_paragraph, anchor: map.images[i].anchor, operation: "resolve current source paragraph" });
            index = this.indexOf(map.paragraph_order, map.images[i].source_paragraph);
            this.check(index >= 0, "source paragraph missing from import order");
            paragraph = this.paragraph(story, index, "current image paragraph"); caption = i === 0 ? source.textboxes[0].text : null;
            images[i] = this.image(doc, page, audit.assets[i], File(root + "/" + audit.assets[i].file), paragraph, map.images[i], caption, tokens);
            // Retrieve again after mutation: the old paragraph/insertion point specifier may have expired.
            this.describe({ operation: "resolve paragraph after anchoring" });
            var currentParagraph = this.paragraph(story, index, "image paragraph after anchoring");
            this.insertion(currentParagraph, map.images[i].anchor);
        }
        this.stage("history-flow", { operation: "thread History body frames", frame_label: "SHAN_HISTORY:body" });
        var frames = this.flow(doc, story, first, tokens);
        var result = { story: story, frames: frames, images: images, marker: marker };
        this.stage("history-validate", { operation: "compare source and document paragraphs" });
        var report = this.validate(doc, result, source, map, tokens, context);
        doc.insertLabel("SHAN_HISTORY_REPORT", report); result.report = report;
        return result;
    }
};
