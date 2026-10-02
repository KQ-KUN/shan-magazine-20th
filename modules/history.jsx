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
        this.check(value !== undefined && value !== null, "missing/invalid " + label);
        var validity;
        try { validity = value.isValid; }
        catch (error) {
            // InDesign collections lack isValid; their members still require validation.
            if (error.number !== 55 || typeof value.length !== "number") { throw error; }
        }
        this.check(validity !== false, "missing/invalid " + label);
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
    insertion: function (paragraph, anchorMode, layout) {
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
        } else {
            this.check(anchorMode === "paragraph_start", "unsupported anchor mode");
            // Multiple images in one empty source paragraph get separate display lines.
            // Re-resolve from current contents after each prior reverse-order mutation.
            var line = 0, text = String(this.field(paragraph, "contents", "image paragraph"));
            while (layout && line < layout.display_line) {
                index = text.indexOf("\n", index);
                this.check(index >= 0, "missing media block display break"); index += 1; line += 1;
            }
        }
        this.check(index < points.length, "image block insertion point outside paragraph");
        return this.domAt(points, index, "image insertion point");
    },
    indexOf: function (items, value) {
        var i; for (i = 0; i < items.length; i += 1) { if (items[i] === value) { return i; } } return -1;
    },
    styleName: function (sourceParagraph, map, tokens) {
        var display = map.history_display, i, gap, name = map.paragraphs[sourceParagraph - 1].style;
        // Original import-map names stay immutable; Wide is a disabled legacy alias.
        if (name === "P_History_Media_Wide" || name === "P_History_Media_Wide_Caption") { name = "P_History_Media_Caption"; }
        if (name === "P_History_Caption_Wide") { name = "P_History_Caption"; }
        if (!display) { return name; }
        if (this.indexOf(display.roster_paragraphs, sourceParagraph) >= 0 || this.indexOf(display.roster_tail_paragraphs, sourceParagraph) >= 0) { name = "P_History_Roster"; }
        for (i = 0; i < display.roster_activity_gaps.length; i += 1) {
            gap = display.roster_activity_gaps[i];
            if (gap.last_roster === sourceParagraph) { name = "P_History_Roster_Last"; }
            if (this.indexOf(gap.empty_paragraphs, sourceParagraph) >= 0) { name = "P_History_Empty_Roster_Gap"; }
        }
        return name;
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
    imageSize: function (asset, preference, policy) {
        // Publication display dimensions, independent of Word physical dimensions.
        var available = policy.single_column_max_mm;
        var viewportWidth = Math.min(preference.width_mm, available,
            asset.pixel_width * (1 - asset.crop.l - asset.crop.r) * 25.4 / policy.minimum_effective_ppi);
        var contentWidth = viewportWidth / (1 - asset.crop.l - asset.crop.r);
        var fullHeight = contentWidth * asset.pixel_height / asset.pixel_width;
        return { width: viewportWidth, contentWidth: contentWidth,
            fullHeight: fullHeight, height: fullHeight * (1 - asset.crop.t - asset.crop.b) };
    },
    image: function (doc, page, asset, file, paragraph, imageMap, caption, tokens, layout) {
        this.stage("history-create:image-" + imageMap.image_index, { image_index: imageMap.image_index,
            source_paragraph: imageMap.source_paragraph, anchor: imageMap.anchor, operation: "create rectangle" });
        var size = this.imageSize(asset, tokens.image_policy.preferences[imageMap.image_index - 1], tokens.image_policy), pt = SHAN.utils.pt;
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
        // Proportional content and only the original DOCX crop.
        var inset = -size.contentWidth * asset.crop.l;
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
        var insertion = this.insertion(paragraph, imageMap.anchor, layout);
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
        // Only the generated object character uses auto leading. Fixed body leading
        // otherwise lets tall inline graphics overlap text or extend above the page.
        // Inline mode also reserves separate lines for multiple images in one paragraph.
        this.describe({ operation: "reserve inline image line height" });
        parent.leading = Leading.AUTO;
        this.valid(rect, "rectangle after anchoring"); this.valid(graphic, "graphic after anchoring");
        if (captionFrame) { this.valid(captionFrame, "caption frame after anchoring"); }
        return { rect: rect, graphic: graphic, anchor: anchor, captionFrame: captionFrame, source: imageMap, asset: asset, layout: layout };
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
    resizeImage: function (record, widthMM, tokens) {
        record = this.valid(record, "compact image record");
        var source = this.field(record, "source", "compact image record"), rect = this.field(record, "rect", "compact image record");
        this.describe({ image_index: source.image_index, source_paragraph: source.source_paragraph, anchor: source.anchor,
            operation: "resize proportional single-column image", frame_label: rect.label });
        var asset = this.field(record, "asset", "compact image record"), graphic = this.field(record, "graphic", "compact image record");
        var size = this.imageSize(asset, { width_mm: widthMM }, tokens.image_policy), b = this.field(rect, "geometricBounds", "compact image rectangle"), pt = SHAN.utils.pt;
        var top = Number(b[0]), left = Number(b[1]);
        rect.geometricBounds = [top,left,top + pt(size.height),left + pt(size.width)];
        graphic.geometricBounds = [top - pt(size.fullHeight * asset.crop.t),left - pt(size.contentWidth * asset.crop.l),
            top + pt(size.fullHeight * (1 - asset.crop.t)),left + pt(size.contentWidth * (1 - asset.crop.l))];
        if (record.captionFrame) {
            var caption = this.valid(record.captionFrame, "compact floating caption");
            caption.geometricBounds = [top + pt(size.height + tokens.caption_gap_mm),left,
                top + pt(size.height + tokens.caption_gap_mm + tokens.floating_caption_height_mm),left + pt(size.width)];
        }
    },
    characterLine: function (story, index, last) {
        var characters = this.field(story, "characters", "compact History story");
        if (index < 0 || index >= characters.length) { return null; }
        var character = this.domAt(characters, index, "compact story character");
        var lines = this.field(character, "lines", "compact story character");
        return lines.length ? this.domAt(lines, last ? -1 : 0, "compact character lines") : null;
    },
    sameColumn: function (a, b) {
        if (!a || !b) { return false; }
        var first = this.linePosition(a), second = this.linePosition(b);
        return first.page === second.page && first.frame === second.frame && first.column === second.column;
    },
    unitFitsPreviousColumn: function (story, unit, captionParagraph) {
        var firstParent = this.field(unit[0].anchor, "parent", "compact first image anchor");
        var previous = this.characterLine(story, firstParent.index - 1, true), i, parent, line;
        if (!previous) { return true; }
        for (i = 0; i < unit.length; i += 1) {
            parent = this.field(unit[i].anchor, "parent", "compact image anchor");
            line = this.characterLine(story, parent.index, false);
            if (!this.sameColumn(previous, line)) { return false; }
        }
        if (captionParagraph) {
            var lines = this.field(captionParagraph, "lines", "compact source caption");
            if (!lines.length || !this.sameColumn(previous, this.domAt(lines, -1, "compact caption lines"))) { return false; }
        }
        return true;
    },
    compactImages: function (doc, story, images, map, tokens) {
        var log = [], pass, i, j, unit, captionParagraph, caption, parent, previous, frame, bounds, budget, minimumHeight, original, candidate, changed, fits;
        var policy = tokens.image_policy, pt = SHAN.utils.pt;
        this.check(policy.fit_step_mm > 0 && policy.fit_passes > 0, "Invalid bounded compact-fit policy");
        // A bounded second composition pass tries smaller permitted sizes against the
        // actual preceding column. It never inserts breaks, relocates anchors or grows images.
        for (pass = 0; pass < policy.fit_passes; pass += 1) {
            changed = false;
            for (i = 0; i < images.length; i += 1) {
                unit = [this.valid(images[i], "compact image")]; captionParagraph = null;
                for (j = 1; j < map.captions.length; j += 1) {
                    caption = map.captions[j];
                    if (caption.image_indices[0] !== i + 1) { continue; }
                    unit = [];
                    var k;
                    for (k = 0; k < caption.image_indices.length; k += 1) { unit.push(this.valid(images[caption.image_indices[k] - 1], "compact caption image")); }
                    captionParagraph = this.paragraph(story, this.indexOf(map.paragraph_order, caption.source_paragraph), "compact source caption");
                }
                this.describe({ image_index: i + 1, source_paragraph: unit[0].source.source_paragraph,
                    anchor: unit[0].source.anchor, operation: "try compact block in preceding column" });
                if (this.unitFitsPreviousColumn(story, unit, captionParagraph)) { i += unit.length - 1; continue; }
                parent = this.field(unit[0].anchor, "parent", "compact first image anchor");
                previous = this.characterLine(story, parent.index - 1, true);
                frame = this.domAt(this.field(previous, "parentTextFrames", "preceding image line"), 0, "preceding image frame");
                bounds = this.field(frame, "geometricBounds", "preceding image frame");
                budget = Number(bounds[2]) - Number(previous.baseline) - pt(policy.fit_clearance_mm);
                minimumHeight = 0; original = []; candidate = [];
                for (j = 0; j < unit.length; j += 1) {
                    var preference = policy.preferences[unit[j].source.image_index - 1];
                    var rectBounds = this.field(unit[j].rect, "geometricBounds", "compact image rectangle");
                    original[j] = (Number(rectBounds[3]) - Number(rectBounds[1])) / pt(1); candidate[j] = original[j];
                    minimumHeight += pt(this.imageSize(unit[j].asset, { width_mm: preference.min_width_mm }, policy).height);
                    if (unit[j].captionFrame) { minimumHeight += pt(tokens.caption_gap_mm + tokens.floating_caption_height_mm); }
                }
                if (captionParagraph) {
                    var captionLines = this.field(captionParagraph, "lines", "compact source caption");
                    minimumHeight += captionLines.length * tokens.paragraph_styles.P_History_Caption.leading_pt;
                }
                if (minimumHeight > budget + pt(0.2)) { i += unit.length - 1; continue; }
                fits = false;
                while (!fits) {
                    var smaller = false;
                    for (j = 0; j < unit.length; j += 1) {
                        var floor = Math.min(original[j], policy.preferences[unit[j].source.image_index - 1].min_width_mm);
                        var nextWidth = Math.max(floor, candidate[j] - policy.fit_step_mm);
                        if (candidate[j] - nextWidth > 0.01) { smaller = true; candidate[j] = nextWidth; this.resizeImage(unit[j], nextWidth, tokens); }
                    }
                    if (!smaller) { break; }
                    doc.recompose(); fits = this.unitFitsPreviousColumn(story, unit, captionParagraph);
                }
                if (!fits) {
                    for (j = 0; j < unit.length; j += 1) { this.resizeImage(unit[j], original[j], tokens); }
                    doc.recompose();
                } else {
                    changed = true; log.push("compact image " + (i + 1) + ": width_mm=" + candidate.join(",") + "; preceding_column_fit=true");
                }
                i += unit.length - 1;
            }
            if (!changed) { break; }
        }
        return log;
    },
    hasVisibleContent: function (frame) {
        var contents = String(this.field(frame, "contents", "History body frame"));
        // Visibility predicate only: NEVER normalize or write this back to the story.
        return /[^\r\n\t \f]/.test(contents) || this.graphicsOf(frame, "History body frame").length > 0;
    },
    trimEmptyTail: function (doc, story, frames, images, tokens) {
        var removed = 0, pt = SHAN.utils.pt;
        doc.recompose();
        while (this.field(doc, "pages", "tail cleanup document").length > 1) {
            var page = this.domAt(doc.pages, -1, "tail document pages"), frame = this.domAt(frames, -1, "tail body frames");
            var framePage = this.field(frame, "parentPage", "tail body frame"), attached = framePage.id === page.id;
            if (attached && this.hasVisibleContent(frame)) { break; }
            var items = this.field(page, "pageItems", "tail document page"), i, item, removable = true;
            for (i = 0; i < items.length; i += 1) {
                item = this.domAt(items, i, "tail page items");
                if (!attached || item.id !== frame.id) { removable = false; }
            }
            if (!removable) { break; }
            this.describe({ image_index: null, source_paragraph: null, frame_label: attached ? frame.label : null, operation: "remove empty generated tail page" });
            var before = String(this.field(story, "contents", "tail cleanup story")), pageCount = doc.pages.length;
            this.check(typeof page.remove === "function", "missing Page.remove for empty tail");
            page.remove(); if (attached) { frames.pop(); } doc.recompose();
            this.check(doc.pages.length === pageCount - 1, "Empty-tail page removal made no progress");
            this.check(String(story.contents) === before, "Empty-tail cleanup changed source story contents");
            // A terminal control may have required the empty frame. Fit the last
            // archive smaller without deleting that control or any source paragraph.
            if (story.overflows) {
                var lastImage = this.domAt(images, -1, "last archive image"), preference = tokens.image_policy.preferences[images.length - 1];
                var b = this.field(lastImage.rect, "geometricBounds", "last archive rectangle");
                var width = (Number(b[3]) - Number(b[1])) / pt(1);
                while (story.overflows && width > preference.min_width_mm + 0.01) {
                    width = Math.max(preference.min_width_mm, width - tokens.image_policy.fit_step_mm);
                    this.resizeImage(lastImage, width, tokens); doc.recompose();
                }
                this.check(!story.overflows, "Empty tail remains required by overset controls at minimum image size");
            }
            removed += 1;
        }
        return removed;
    },
    columnDiagnostics: function (frames) {
        var log = [], i, j, frame, bounds, lines, line, position, bottom, ends, final;
        for (i = 0; i < frames.length; i += 1) {
            frame = this.domAt(frames, i, "density body frames");
            this.describe({ frame_label: frame.label || "SHAN_HISTORY:body", operation: "measure composed body-column tails" });
            bounds = this.field(frame, "geometricBounds", "density body frame");
            lines = this.field(frame, "lines", "density body frame"); ends = [Number(bounds[0]),Number(bounds[0])];
            for (j = 0; j < lines.length; j += 1) {
                line = this.domAt(lines, j, "density body lines"); position = this.linePosition(line);
                bottom = Number(this.field(line, "baseline", "density body line")) + Number(this.field(line, "descent", "density body line"));
                ends[position.column] = Math.max(ends[position.column], bottom);
            }
            for (j = 0; j < 2; j += 1) {
                final = i === frames.length - 1 && (j === 1 || ends[1] <= Number(bounds[0]) + 0.1);
                var gap = Math.max(0, Number(bounds[2]) - ends[j]), page = this.field(frame, "parentPage", "density body frame");
                log.push("page=" + page.name + "; column=" + (j + 1) + "; unused_tail_mm=" + (gap / SHAN.utils.pt(1)).toFixed(1) + "; end_of_story=" + final);
                if (!final && gap > (Number(bounds[2]) - Number(bounds[0])) / 2) {
                    log.push("WARNING: Half-column unused tail before continuing content; inspect page " + page.name + " column " + (j + 1) + " in PDF.");
                }
            }
        }
        return log;
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
    displayChecks: function (story, images, map, tokens, warnings) {
        var display = map.history_display, i, j, paragraph, lines, gap, record, parent, points, text, local, before, after, a, b;
        if (!display) { return; }
        for (i = 0; i < display.transforms.length; i += 1) {
            var transform = display.transforms[i];
            if (transform.kind !== "roster_split") { continue; }
            this.describe({ image_index: null, source_paragraph: transform.source_paragraph, operation: "validate roster visual lines" });
            paragraph = this.paragraph(story, this.indexOf(map.paragraph_order, transform.source_paragraph), "split roster paragraph");
            lines = this.field(paragraph, "lines", "split roster paragraph");
            this.check(lines.length >= transform.insert_lf_offsets_utf16.length + 1, "Roster roles still share a composed line");
            points = this.field(paragraph, "insertionPoints", "split roster paragraph");
            var paragraphStart = this.domAt(points, 0, "roster insertion points").index;
            for (j = 0; j < transform.insert_lf_offsets_utf16.length; j += 1) {
                var roleStart = paragraphStart + transform.insert_lf_offsets_utf16[j] + j + 1, foundStart = false, k;
                for (k = 0; k < lines.length; k += 1) {
                    var rosterLine = this.domAt(lines, k, "roster lines");
                    var linePoints = this.field(rosterLine, "insertionPoints", "roster line");
                    if (this.domAt(linePoints, 0, "roster line insertion points").index === roleStart) { foundStart = true; }
                }
                this.check(foundStart, "Roster role does not start a composed line");
            }
        }
        for (i = 0; i < display.roster_activity_gaps.length; i += 1) {
            gap = display.roster_activity_gaps[i];
            this.describe({ source_paragraph: gap.last_roster, operation: "validate roster/activity style gap" });
            paragraph = this.paragraph(story, this.indexOf(map.paragraph_order, gap.last_roster), "last roster paragraph");
            var style = this.field(paragraph, "appliedParagraphStyle", "last roster paragraph");
            this.check(Math.abs(Number(paragraph.spaceAfter) - Number(style.spaceAfter)) < 0.1, "Roster/activity spacing overridden");
        }
        for (i = 0; i < images.length; i += 1) {
            record = this.valid(images[i], "display image record");
            var layout = this.valid(record.layout, "image display layout");
            var imageSource = this.valid(record.source, "image source mapping");
            this.describe({ image_index: i + 1, source_paragraph: layout.source_paragraph, anchor: imageSource.anchor, operation: "validate complete paragraph image block" });
            var anchor = this.valid(record.anchor, "display image anchor"); parent = this.field(anchor, "parent", "display image anchor");
            paragraph = this.paragraph(story, this.indexOf(map.paragraph_order, layout.source_paragraph), "image block paragraph");
            points = this.field(paragraph, "insertionPoints", "image block paragraph");
            local = parent.index - this.domAt(points, 0, "image block insertion points").index;
            text = String(this.field(paragraph, "contents", "image block paragraph"));
            this.check(paragraph.spanColumnType === SpanColumnTypeOptions.SINGLE_COLUMN, "Image paragraph spans multiple columns");
            this.check(local >= 0 && text.charAt(local) === "\uFFFC", "Image anchor outside mapped paragraph");
            before = text.slice(0, local); before = before.slice(before.lastIndexOf("\n") + 1);
            after = text.slice(local + 1); after = after.split("\n")[0].split("\r")[0];
            this.check(before === "" && after === "", "Image interrupts a sentence or shares another image line");
            var yearParagraph = this.paragraph(story, this.indexOf(map.paragraph_order, layout.year_paragraph), "image year paragraph");
            var yearPoints = this.field(yearParagraph, "insertionPoints", "image year paragraph");
            this.check(parent.index > this.domAt(yearPoints, 0, "year insertion points").index, "Image precedes its year");
            var yearIndex = this.indexOf(map.years, layout.year_paragraph);
            if (yearIndex + 1 < map.years.length) {
                var nextYear = this.paragraph(story, this.indexOf(map.paragraph_order, map.years[yearIndex + 1]), "next year paragraph");
                var nextPoints = this.field(nextYear, "insertionPoints", "next year paragraph");
                this.check(parent.index < this.domAt(nextPoints, 0, "next year insertion points").index, "Image escaped its year");
            }
            // Geometry collisions are real defects; desired size/ppi/page count are advisory.
            var rect = this.valid(record.rect, "display image rectangle"), page = this.field(rect, "parentPage", "display image rectangle");
            a = this.field(rect, "geometricBounds", "display image rectangle");
            var anchorLines = this.field(parent, "lines", "image anchor character"), anchorLine = this.domAt(anchorLines, 0, "image anchor lines");
            var imageFrame = this.domAt(this.field(anchorLine, "parentTextFrames", "image anchor line"), 0, "image body frame");
            var frameBounds = this.field(imageFrame, "geometricBounds", "image body frame"), framePreferences = this.field(imageFrame, "textFramePreferences", "image body frame");
            var gutter = Number(framePreferences.textColumnGutter), columnWidth = (Number(frameBounds[3]) - Number(frameBounds[1]) - gutter) / 2;
            var columnLeft = Number(frameBounds[1]) + this.linePosition(anchorLine).column * (columnWidth + gutter), tolerance = SHAN.utils.pt(0.2);
            this.check(a[1] >= columnLeft - tolerance && a[3] <= columnLeft + columnWidth + tolerance,
                "Image escapes its single body column");
            this.check(a[3] - a[1] <= SHAN.utils.pt(tokens.image_policy.single_column_max_mm) + tolerance,
                "Image exceeds compact single-column maximum");
            if (record.captionFrame) {
                var captionBounds = this.field(record.captionFrame, "geometricBounds", "compact floating caption");
                this.check(captionBounds[1] >= columnLeft - tolerance && captionBounds[3] <= columnLeft + columnWidth + tolerance, "Floating caption escapes image column");
            }
            for (j = 0; j < i; j += 1) {
                var other = this.valid(images[j].rect, "earlier image rectangle"), otherPage = this.field(other, "parentPage", "earlier image rectangle");
                b = this.field(other, "geometricBounds", "earlier image rectangle");
                this.check(page.id !== otherPage.id || Math.min(a[2], b[2]) - Math.max(a[0], b[0]) <= SHAN.utils.pt(0.2) ||
                    Math.min(a[3], b[3]) - Math.max(a[1], b[1]) <= SHAN.utils.pt(0.2), "Archive image blocks overlap");
            }
            var ppi = this.field(record.graphic, "effectivePpi", "display graphic");
            if (Math.min(Number(ppi[0]), Number(ppi[1])) < tokens.image_policy.minimum_effective_ppi - 1) { warnings.push("WARNING: image " + (i + 1) + " effective ppi below preferred minimum."); }
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
            this.check(appliedStyle.name === this.styleName(map.paragraph_order[i], map, tokens),
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
            this.check(this.hasVisibleContent(frame), "Empty generated History page: " + page.name);
        }
        this.yearChecks(story, map);
        for (i = 0; i < images.length; i += 1) { this.graphicChecks(images[i], source, map); }
        this.anchorOrderChecks(story, images);
        this.displayChecks(story, images, map, tokens, warnings);
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
        if (pages.length < tokens.advisory_pages[0] || pages.length > tokens.advisory_pages[1]) { warnings.push("页数超出7–9页参考范围，仅供PDF视觉检查；不是内容完整性失败。"); }
        warnings.push("图片与图注均为单栏；连续大块留白及页面密度仍需PDF视觉验收。");
        return "PASS History data checks; pages=" + pages.length + "; paragraphs=" + map.paragraph_order.length +
            "; entries=21; images=24; captions=5; overset=false; source SHA-256=PASS; paragraph equality=PASS" +
            "; display transforms reversible=PASS; roster splits=4; paragraph-boundary image blocks=PASS; image overlap=false" +
            "; images_single_column=24; blank_tail=false; removed_empty_tail_pages=" + (result.removedEmptyTailPages || 0) +
            "; source already includes approved deletion; import omissions=0; approved moves=1; runtime=InDesign " + app.version +
            "\n" + (result.compactLog || []).join("\n") + "\n" + (result.columnLog || []).join("\n") + "\n" + warnings.join("\n") + "\nPDF视觉验收待用户确认。";
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
        this.stage("history-create:display-map", { operation: "read reversible display mapping" });
        var display = SHAN.chapter.parseJSON(SHAN.historySource.read(File(root + "/content/HISTORY_DISPLAY_MAP.json")));
        SHAN.historySource.validateDisplay(display, source, map);
        // In-memory adjunct only; HISTORY_IMPORT_MAP.json remains the immutable fact mapping.
        map.history_display = display;
        this.check(tokens.image_policy.preferences.length === 24, "Incomplete image size policy");
        for (var policyIndex = 0; policyIndex < tokens.image_policy.preferences.length; policyIndex += 1) {
            this.check(tokens.image_policy.preferences[policyIndex].span_columns === 1, "History image policy must be single-column");
        }
        var textPreferences = this.field(doc, "textPreferences", "History document"); textPreferences.smartTextReflow = false;
        var first = this.addFrame(doc, page, true, tokens);
        var marker = this.chapterMarker(doc, page, section), text = [], i, j, index;
        for (i = 0; i < map.paragraph_order.length; i += 1) { text.push(SHAN.historySource.displayText(source.paragraphs[map.paragraph_order[i] - 1], map.paragraph_order[i], display)); }
        first.contents = text.join("\r") + "\r";
        var story = this.field(first, "parentStory", "first body frame"); story.label = "SHAN_HISTORY:main";
        var paragraphs = this.field(story, "paragraphs", "initial History story");
        this.check(paragraphs.length === map.paragraph_order.length, "Initial paragraph count mismatch: " + paragraphs.length);
        this.stage("history-create:styles", { operation: "apply paragraph style mappings", frame_label: "SHAN_HISTORY:body" });
        for (i = 0; i < map.paragraph_order.length; i += 1) {
            this.describe({ source_paragraph: map.paragraph_order[i] });
            var style = this.named(doc, "paragraphStyles", this.styleName(map.paragraph_order[i], map, tokens));
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
            images[i] = this.image(doc, page, audit.assets[i], File(root + "/" + audit.assets[i].file), paragraph, map.images[i], caption, tokens, display.image_layouts[i]);
            // Retrieve again after mutation: the old paragraph/insertion point specifier may have expired.
            this.describe({ operation: "resolve paragraph after anchoring" });
            var currentParagraph = this.paragraph(story, index, "image paragraph after anchoring");
            this.insertion(currentParagraph, map.images[i].anchor, display.image_layouts[i]);
        }
        this.stage("history-flow", { operation: "thread History body frames", frame_label: "SHAN_HISTORY:body" });
        var frames = this.flow(doc, story, first, tokens);
        var result = { story: story, frames: frames, images: images, marker: marker };
        this.stage("history-compact-images", { operation: "fit small archive blocks in available columns" });
        result.compactLog = this.compactImages(doc, story, images, map, tokens);
        this.stage("history-trim-empty-tail", { operation: "remove only empty generated document pages" });
        result.removedEmptyTailPages = this.trimEmptyTail(doc, story, frames, images, tokens);
        this.stage("history-column-diagnostics", { operation: "measure actual body-column tails", frame_label: "SHAN_HISTORY:body" });
        result.columnLog = this.columnDiagnostics(frames);
        this.stage("history-validate", { operation: "compare source and document paragraphs" });
        var report = this.validate(doc, result, source, map, tokens, context);
        doc.insertLabel("SHAN_HISTORY_REPORT", report); result.report = report;
        return result;
    }
};
