var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.associationProfile = {
    validateData: function (data) {
        var i, field, imageCount = 0;
        if (!data || !/^[a-z][a-z0-9_]*$/.test(data.id) || !data.title || data.copy_status !== "LOCKED_FINAL") {
            throw new Error("Invalid Association Profile content contract");
        }
        if (!(data.fields instanceof Array) || data.fields.length !== 5 || !(data.body instanceof Array) || data.body.length !== 2) {
            throw new Error("Association Profile requires five fields and two body paragraphs");
        }
        for (i = 0; i < data.fields.length; i += 1) {
            field = data.fields[i];
            if (!field.label || !field.value || (field.type !== "text" && field.type !== "image")) {
                throw new Error("Invalid Association Profile field " + (i + 1));
            }
            if (field.type === "image") { imageCount += 1; }
        }
        if (imageCount !== 1 || !data.body[0] || !data.body[1]) { throw new Error("Association Profile content is incomplete"); }
        return data;
    },
    visibleText: function (data) {
        var parts = [data.title], i;
        for (i = 0; i < data.fields.length; i += 1) {
            parts.push(data.fields[i].label);
            if (data.fields[i].type === "text") { parts.push(data.fields[i].value); }
        }
        parts.push(data.body[0]); parts.push(data.body[1]);
        return parts.join("\n");
    },
    normalizeText: function (value) { return String(value).replace(/\r\n|\r/g, "\n"); },
    getFirstGraphic: function (pageItem) {
        var graphics = null, first = null;
        if (!pageItem || pageItem.isValid === false) { return null; }
        try { graphics = pageItem.allGraphics; } catch (ignoreAllGraphics) { graphics = null; }
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
    addTextFrame: function (doc, page, bounds, styleName, contents, label) {
        var frame = page.textFrames.add();
        frame.label = label; frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Text_Main");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1; frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.geometricBounds = bounds; frame.contents = contents;
        frame.parentStory.paragraphs.everyItem().appliedParagraphStyle = doc.paragraphStyles.itemByName(styleName);
        return frame;
    },
    placeLogo: function (doc, page, bounds, source, label) {
        if (!source.exists) { throw new Error("Association Profile logo missing: " + source.fsName); }
        var frame = page.rectangles.add();
        frame.label = label; frame.appliedObjectStyle = doc.objectStyles.itemByName("O_Image");
        frame.fillColor = doc.swatches.item(0); frame.strokeColor = doc.swatches.item(0);
        frame.geometricBounds = bounds; frame.place(source, false);
        frame.fit(FitOptions.PROPORTIONALLY); frame.fit(FitOptions.CENTER_CONTENT);
        return frame;
    },
    checkStyles: function (doc) {
        var names = ["P_Association_Title", "P_Association_Label", "P_Association_Value", "P_Association_Body"], i;
        for (i = 0; i < names.length; i += 1) {
            if (!doc.paragraphStyles.itemByName(names[i]).isValid) { throw new Error("Missing Association Profile style: " + names[i]); }
        }
        if (!doc.masterSpreads.itemByName("I-FRONT").isValid) { throw new Error("Missing I-FRONT Parent"); }
    },
    render: function (doc, data, tokens, root) {
        data = this.validateData(data); this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Association Profile requires one fresh document page"); }
        var page = doc.pages.item(0), b = page.bounds, pt = SHAN.utils.pt, layout = tokens.layout;
        var x = b[1] + pt(layout.left_mm), valueX = x + pt(layout.label_width_mm + layout.label_value_gap_mm);
        var y = b[0] + pt(layout.info_top_mm), frames = [], logo = null, i, field, rowHeight;
        page.appliedMaster = doc.masterSpreads.itemByName("I-FRONT");
        frames.push(this.addTextFrame(doc, page,
            [b[0] + pt(layout.title_top_mm), x, b[0] + pt(layout.title_top_mm + layout.title_height_mm), x + pt(layout.title_width_mm)],
            "P_Association_Title", data.title, "SHAN_ASSOCIATION:" + data.id + ":title"));
        for (i = 0; i < data.fields.length; i += 1) {
            field = data.fields[i]; rowHeight = field.type === "image" ? layout.logo_row_height_mm : layout.text_row_height_mm;
            frames.push(this.addTextFrame(doc, page, [y, x, y + pt(rowHeight), x + pt(layout.label_width_mm)],
                "P_Association_Label", field.label, "SHAN_ASSOCIATION:" + data.id + ":label:" + (i + 1)));
            if (field.type === "image") {
                logo = this.placeLogo(doc, page, [y, valueX, y + pt(layout.logo_width_mm), valueX + pt(layout.logo_width_mm)],
                    File(root + "/" + field.value), "SHAN_ASSOCIATION:" + data.id + ":logo");
            } else {
                frames.push(this.addTextFrame(doc, page, [y, valueX, y + pt(rowHeight), valueX + pt(layout.value_width_mm)],
                    "P_Association_Value", field.value, "SHAN_ASSOCIATION:" + data.id + ":value:" + (i + 1)));
            }
            y += pt(rowHeight + layout.row_gap_mm);
        }
        y += pt(layout.body_gap_mm);
        frames.push(this.addTextFrame(doc, page, [y, x, b[2] - pt(layout.body_bottom_mm), x + pt(layout.body_width_mm)],
            "P_Association_Body", data.body.join("\r"), "SHAN_ASSOCIATION:" + data.id + ":body"));
        doc.recompose();
        var overset = false;
        for (i = 0; i < frames.length; i += 1) { if (frames[i].overflows) { overset = true; } }
        doc.insertLabel("SHAN_ASSOCIATION_PROFILE_REPORT", "article=" + data.id + "; pages=" + doc.pages.length +
            "; textFrames=" + frames.length + "; logo=" + (logo ? 1 : 0) + "; overset=" + overset);
        return { page: page, textFrames: frames, logo: logo, overset: overset };
    },
    assertRendered: function (doc, result, data, tokens) {
        var i, frame, fb, pb = result.page.bounds, intersects = false, actual = [], visibleCharacters = 0;
        if (doc.pages.length !== 1 || result.textFrames.length < 1) { throw new Error("Association Profile page/textFrames assertion failed"); }
        for (i = 0; i < result.textFrames.length; i += 1) {
            frame = result.textFrames[i]; fb = frame.geometricBounds;
            if (fb[2] > pb[0] && fb[0] < pb[2] && fb[3] > pb[1] && fb[1] < pb[3]) { intersects = true; }
            if (!frame.itemLayer.visible) { throw new Error("Association Profile text is on a hidden layer"); }
            actual.push(this.normalizeText(frame.parentStory.contents));
            visibleCharacters += String(frame.parentStory.contents).replace(/\s/g, "").length;
            if (frame.overflows) { throw new Error("Association Profile text frame overset"); }
        }
        if (!intersects || visibleCharacters <= 150) { throw new Error("Association Profile has no visible page text"); }
        if (actual.join("\n") !== this.visibleText(data)) { throw new Error("Association Profile visible copy differs from locked JSON"); }
        var graphic = this.getFirstGraphic(result.logo);
        if (!result.logo || !result.logo.itemLayer.visible || !graphic || !graphic.itemLink ||
                !graphic.itemLink.isValid) { throw new Error("Association Profile logo is missing or hidden"); }
        fb = result.logo.geometricBounds;
        if (!(fb[2] > pb[0] && fb[0] < pb[2] && fb[3] > pb[1] && fb[1] < pb[3])) { throw new Error("Association Profile logo is outside the document page"); }
        var logoWidth = (fb[3] - fb[1]) / SHAN.utils.pt(1);
        if (logoWidth < 24 || logoWidth > 30 || logoWidth > tokens.layout.logo_max_width_mm) { throw new Error("Association Profile logo width out of bounds"); }
        if (result.overset || doc.extractLabel("SHAN_ASSOCIATION_PROFILE_REPORT").indexOf("overset=false") < 0) {
            throw new Error("Association Profile overset assertion failed");
        }
        return { pages: doc.pages.length, textFrames: result.textFrames.length,
            visibleCharacters: visibleCharacters, logoWidthMM: logoWidth, overset: result.overset };
    }
};
