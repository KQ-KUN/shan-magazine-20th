var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.coverSystem = {
    validateData: function (data) {
        if (!data || data.id !== "shan_cover_system_phase_a" || data.status !== "PROTOTYPE_COPY") {
            throw new Error("Invalid Cover System copy contract");
        }
        if (!data.front || !data.front.title_cn || !data.front.subtitle_cn || !data.front.years ||
                !data.back || !data.back.organization || !data.back.wechat || !data.back.logo ||
                data.back.qr_status !== "RESERVED_NOT_RENDERED") {
            throw new Error("Cover System copy is incomplete");
        }
        if (!data.spine || data.spine.status !== "WIDTH_PENDING" ||
                !(data.spine.preferred_text instanceof Array) || data.spine.preferred_text.length !== 3) {
            throw new Error("Cover System spine rule is incomplete");
        }
        return data;
    },
    normalizeText: function (value) { return String(value).replace(/[\r\n\s]+$/g, ""); },
    getFirstGraphic: function (pageItem) {
        var graphics = null, first = null;
        if (!pageItem || pageItem.isValid === false) { return null; }
        try { graphics = pageItem.allGraphics; } catch (ignoreAll) { graphics = null; }
        if (graphics && graphics.length > 0) {
            first = graphics[0];
            if (first && first.isValid !== false) { return first; }
            if (typeof graphics.item === "function") {
                first = graphics.item(0);
                if (first && first.isValid !== false) { return first; }
            }
        }
        try { graphics = pageItem.graphics; } catch (ignoreGraphics) { graphics = null; }
        if (graphics && graphics.length > 0) {
            first = graphics[0];
            if (first && first.isValid !== false) { return first; }
            if (typeof graphics.item === "function") {
                first = graphics.item(0);
                if (first && first.isValid !== false) { return first; }
            }
        }
        return null;
    },
    addTextFrame: function (doc, page, boundsMM, styleName, contents, label) {
        var b = page.bounds, p = SHAN.utils.pt, frame = page.textFrames.add();
        frame.label = label; frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1; frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.geometricBounds = [b[0] + p(boundsMM[0]), b[1] + p(boundsMM[1]),
            b[0] + p(boundsMM[2]), b[1] + p(boundsMM[3])];
        frame.contents = contents;
        frame.parentStory.paragraphs.everyItem().appliedParagraphStyle = doc.paragraphStyles.itemByName(styleName);
        return frame;
    },
    addPaper: function (doc, page, tokens, label) {
        var b = page.bounds, p = SHAN.utils.pt, bleed = p(tokens.page.bleed_mm);
        var paper = page.rectangles.add();
        paper.label = label; paper.geometricBounds = [b[0] - bleed, b[1] - bleed, b[2] + bleed, b[3] + bleed];
        paper.fillColor = doc.colors.itemByName("C_PAPER"); paper.strokeColor = doc.swatches.item(0);
        return paper;
    },
    addRule: function (doc, page, yMM, xMM, lengthMM, colorName, weight, label) {
        var b = page.bounds, p = SHAN.utils.pt, line = page.graphicLines.add();
        line.label = label;
        line.geometricBounds = [b[0] + p(yMM), b[1] + p(xMM), b[0] + p(yMM), b[1] + p(xMM + lengthMM)];
        line.strokeColor = doc.colors.itemByName(colorName); line.strokeWeight = weight;
        return line;
    },
    addMotifLine: function (doc, page, points, colorName, weight, tint, handleMM, label) {
        var b = page.bounds, p = SHAN.utils.pt, line = page.graphicLines.add(), path = [], point, i;
        line.label = label; line.strokeColor = doc.colors.itemByName(colorName);
        line.strokeWeight = weight; line.strokeTint = tint;
        for (i = 0; i < points.length; i += 1) {
            path.push([b[1] + p(points[i][0]), b[0] + p(points[i][1])]);
        }
        line.paths.item(0).entirePath = path;
        for (i = 0; i < line.paths.item(0).pathPoints.length; i += 1) {
            point = line.paths.item(0).pathPoints.item(i);
            point.leftDirection = [point.anchor[0] - p(handleMM), point.anchor[1]];
            point.rightDirection = [point.anchor[0] + p(handleMM), point.anchor[1]];
        }
        return line;
    },
    placeLogo: function (doc, page, source, layout, label) {
        if (!source.exists) { throw new Error("Cover System logo missing: " + source.fsName); }
        var b = page.bounds, p = SHAN.utils.pt, frame = page.rectangles.add();
        frame.label = label; frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Image");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.geometricBounds = [b[0] + p(layout.logo_top_mm), b[1] + p(layout.logo_x_mm),
            b[0] + p(layout.logo_top_mm + layout.logo_width_mm), b[1] + p(layout.logo_x_mm + layout.logo_width_mm)];
        frame.place(source, false); frame.fit(FitOptions.PROPORTIONALLY); frame.fit(FitOptions.CENTER_CONTENT);
        return frame;
    },
    spineRule: function (data) {
        return { status: data.spine.status, preferredText: data.spine.preferred_text.slice(0),
            compactText: data.spine.compact_text, finalWidthRule: data.spine.final_width_rule, physicalWidthMM: null };
    },
    render: function (doc, data, tokens, root) {
        data = this.validateData(data);
        if (doc.pages.length !== 1) { throw new Error("Cover System requires one fresh document page"); }
        if (tokens.spine.render_physical_spine || tokens.spine.physical_width_status !== "PENDING_FINAL_PAGE_COUNT_PAPER_BINDING") {
            throw new Error("Cover System Phase A cannot render a physical spine");
        }
        doc.documentPreferences.facingPages = false;
        doc.pages.add(LocationOptions.AT_END);
        if (doc.pages.length !== 2) { throw new Error("Cover System must create exactly two document pages"); }
        var front = doc.pages.item(0), back = doc.pages.item(1), result = {
            frontPage: front, backPage: back, frontFrames: [], backFrames: [], motifItems: [],
            pageItems: [], logo: null, spine: this.spineRule(data), overset: false
        };
        var i, lineDef, item;
        item = this.addPaper(doc, front, tokens, "SHAN_COVER:front:paper"); result.pageItems.push(item);
        for (i = 0; i < tokens.front.motif.lines.length; i += 1) {
            lineDef = tokens.front.motif.lines[i];
            item = this.addMotifLine(doc, front, lineDef.points, lineDef.color, tokens.front.motif.weight_pt,
                lineDef.color === "C_SDU_RED" ? tokens.front.motif.red_tint_percent : tokens.front.motif.tint_percent,
                tokens.front.motif.handle_mm, "SHAN_COVER:front:motif:" + (i + 1));
            result.motifItems.push(item); result.pageItems.push(item);
        }
        item = this.addRule(doc, front, tokens.front.layout.marker_y_mm, tokens.front.layout.marker_x_mm,
            tokens.front.layout.marker_length_mm, "C_SDU_RED", tokens.front.layout.marker_weight_pt, "SHAN_COVER:front:marker");
        result.pageItems.push(item);
        item = this.addTextFrame(doc, front, tokens.front.layout.title_bounds_mm, "P_Cover_Title",
            data.front.title_cn, "SHAN_COVER:front:title"); result.frontFrames.push(item); result.pageItems.push(item);
        item = this.addTextFrame(doc, front, tokens.front.layout.subtitle_bounds_mm, "P_Cover_Subtitle",
            data.front.subtitle_cn, "SHAN_COVER:front:subtitle"); result.frontFrames.push(item); result.pageItems.push(item);
        item = this.addTextFrame(doc, front, tokens.front.layout.years_bounds_mm, "P_Cover_Years",
            data.front.years, "SHAN_COVER:front:years"); result.frontFrames.push(item); result.pageItems.push(item);

        item = this.addPaper(doc, back, tokens, "SHAN_COVER:back:paper"); result.pageItems.push(item);
        for (i = 0; i < tokens.back.motif.lines.length; i += 1) {
            item = this.addMotifLine(doc, back, tokens.back.motif.lines[i], "C_LINE", tokens.back.motif.weight_pt,
                tokens.back.motif.tint_percent, tokens.back.motif.handle_mm, "SHAN_COVER:back:motif:" + (i + 1));
            result.motifItems.push(item); result.pageItems.push(item);
        }
        result.logo = this.placeLogo(doc, back, File(root + "/" + data.back.logo), tokens.back.layout, "SHAN_COVER:back:logo");
        result.pageItems.push(result.logo);
        item = this.addRule(doc, back, tokens.back.layout.marker_y_mm, tokens.back.layout.marker_x_mm,
            tokens.back.layout.marker_length_mm, "C_SDU_RED", tokens.back.layout.marker_weight_pt, "SHAN_COVER:back:marker");
        result.pageItems.push(item);
        item = this.addTextFrame(doc, back, tokens.back.layout.organization_bounds_mm, "P_Cover_Back_Organization",
            data.back.organization, "SHAN_COVER:back:organization"); result.backFrames.push(item); result.pageItems.push(item);
        item = this.addTextFrame(doc, back, tokens.back.layout.wechat_bounds_mm, "P_Cover_Back_Wechat",
            data.back.wechat, "SHAN_COVER:back:wechat"); result.backFrames.push(item); result.pageItems.push(item);
        doc.recompose();
        for (i = 0; i < result.frontFrames.length; i += 1) { if (result.frontFrames[i].overflows) { result.overset = true; } }
        for (i = 0; i < result.backFrames.length; i += 1) { if (result.backFrames[i].overflows) { result.overset = true; } }
        doc.insertLabel("SHAN_COVER_SYSTEM_REPORT", "pages=2; frontFrames=" + result.frontFrames.length +
            "; backFrames=" + result.backFrames.length + "; logo=1; spine=" + result.spine.status + "; overset=" + result.overset);
        return result;
    },
    frameIntersectsPage: function (frame, page) {
        var fb = frame.geometricBounds, pb = page.bounds;
        return frame.parentPage && frame.parentPage.isValid !== false && frame.parentPage.id === page.id &&
            fb[2] > pb[0] && fb[0] < pb[2] && fb[3] > pb[1] && fb[1] < pb[3];
    },
    frameWithinSafeArea: function (frame, page, safeMM) {
        var fb = frame.geometricBounds, pb = page.bounds, safe = SHAN.utils.pt(safeMM);
        return fb[0] >= pb[0] + safe && fb[1] >= pb[1] + safe &&
            fb[2] <= pb[2] - safe && fb[3] <= pb[3] - safe;
    },
    itemWithinBleed: function (item, page, bleedMM) {
        var ib = item.geometricBounds, pb = page.bounds, bleed = SHAN.utils.pt(bleedMM), epsilon = 0.1;
        return ib[0] >= pb[0] - bleed - epsilon && ib[1] >= pb[1] - bleed - epsilon &&
            ib[2] <= pb[2] + bleed + epsilon && ib[3] <= pb[3] + bleed + epsilon;
    },
    assertRendered: function (doc, result, data, tokens) {
        var i, frame, page, expectedFront = [data.front.title_cn, data.front.subtitle_cn, data.front.years];
        var expectedBack = [data.back.organization, data.back.wechat], visibleCharacters = 0;
        var prefs = doc.documentPreferences, expectedWidth = SHAN.utils.pt(tokens.page.width_mm);
        var expectedHeight = SHAN.utils.pt(tokens.page.height_mm), expectedBleed = SHAN.utils.pt(tokens.page.bleed_mm);
        var tolerance = 0.1;
        if (Math.abs(prefs.pageWidth - expectedWidth) > tolerance || Math.abs(prefs.pageHeight - expectedHeight) > tolerance ||
                Math.abs(prefs.documentBleedTopOffset - expectedBleed) > tolerance ||
                Math.abs(prefs.documentBleedBottomOffset - expectedBleed) > tolerance ||
                Math.abs(prefs.documentBleedInsideOrLeftOffset - expectedBleed) > tolerance ||
                Math.abs(prefs.documentBleedOutsideOrRightOffset - expectedBleed) > tolerance) {
            throw new Error("Cover System page size or bleed assertion failed");
        }
        if (doc.pages.length !== 2 || result.frontPage.id !== doc.pages.item(0).id || result.backPage.id !== doc.pages.item(1).id) {
            throw new Error("Cover System document page assertion failed");
        }
        if (result.frontFrames.length !== 3 || result.backFrames.length !== 2) { throw new Error("Cover System text frame count failed"); }
        for (i = 0; i < result.frontFrames.length; i += 1) {
            frame = result.frontFrames[i]; page = result.frontPage;
            if (this.normalizeText(frame.parentStory.contents) !== expectedFront[i]) { throw new Error("Cover System front copy mismatch: " + (i + 1)); }
            if (!this.frameIntersectsPage(frame, page) || !this.frameWithinSafeArea(frame, page, tokens.page.critical_safe_mm)) {
                throw new Error("Cover System front critical copy outside trim safe area: " + (i + 1));
            }
            if (!frame.itemLayer.visible || frame.overflows) { throw new Error("Cover System front frame hidden or overset: " + (i + 1)); }
            visibleCharacters += this.normalizeText(frame.parentStory.contents).replace(/\s/g, "").length;
        }
        for (i = 0; i < result.backFrames.length; i += 1) {
            frame = result.backFrames[i]; page = result.backPage;
            if (this.normalizeText(frame.parentStory.contents) !== expectedBack[i]) { throw new Error("Cover System back copy mismatch: " + (i + 1)); }
            if (!this.frameIntersectsPage(frame, page) || !this.frameWithinSafeArea(frame, page, tokens.page.critical_safe_mm)) {
                throw new Error("Cover System back critical copy outside trim safe area: " + (i + 1));
            }
            if (!frame.itemLayer.visible || frame.overflows) { throw new Error("Cover System back frame hidden or overset: " + (i + 1)); }
            visibleCharacters += this.normalizeText(frame.parentStory.contents).replace(/\s/g, "").length;
        }
        var graphic = this.getFirstGraphic(result.logo);
        if (!result.logo || !this.frameIntersectsPage(result.logo, result.backPage) || !result.logo.itemLayer.visible ||
                !graphic || !graphic.itemLink || !graphic.itemLink.isValid) { throw new Error("Cover System back logo missing or hidden"); }
        var logoBounds = result.logo.geometricBounds, logoWidthMM = (logoBounds[3] - logoBounds[1]) / SHAN.utils.pt(1);
        if (logoWidthMM < 20 || logoWidthMM > 28 || logoWidthMM !== tokens.back.layout.logo_width_mm) {
            throw new Error("Cover System back logo width out of bounds");
        }
        for (i = 0; i < result.pageItems.length; i += 1) {
            page = result.pageItems[i].parentPage;
            if (!page || page.isValid === false || !this.itemWithinBleed(result.pageItems[i], page, tokens.page.bleed_mm)) {
                throw new Error("Cover System page item exceeds bleed: " + result.pageItems[i].label);
            }
        }
        if (visibleCharacters < 30 || result.overset || result.spine.status !== "WIDTH_PENDING" ||
                result.spine.physicalWidthMM !== null || tokens.spine.render_physical_spine) {
            throw new Error("Cover System content/spine/overset assertion failed");
        }
        if (doc.extractLabel("SHAN_COVER_SYSTEM_REPORT").indexOf("overset=false") < 0) {
            throw new Error("Cover System report overset assertion failed");
        }
        return { pages: 2, frontFrames: result.frontFrames.length, backFrames: result.backFrames.length,
            visibleCharacters: visibleCharacters, logoWidthMM: logoWidthMM, spineStatus: result.spine.status, overset: false };
    }
};
