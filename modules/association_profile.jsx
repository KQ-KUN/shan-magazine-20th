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
        var names = ["P_Association_Title", "P_Association_Label", "P_Association_Separator",
            "P_Association_Name", "P_Association_Value", "P_Association_Lead", "P_Association_Body",
            "P_Association_Year", "P_Association_Anniversary"], i;
        for (i = 0; i < names.length; i += 1) {
            if (!doc.paragraphStyles.itemByName(names[i]).isValid) { throw new Error("Missing Association Profile style: " + names[i]); }
        }
        if (!doc.masterSpreads.itemByName("I-FRONT").isValid) { throw new Error("Missing I-FRONT Parent"); }
    },
    addRule: function (doc, page, bounds, colorName, weight, label) {
        var line = page.graphicLines.add();
        line.label = label; line.geometricBounds = bounds;
        line.strokeColor = doc.colors.itemByName(colorName); line.strokeWeight = weight;
        return line;
    },
    countOccurrences: function (text, needle) {
        var count = 0, offset = 0, found;
        while ((found = text.indexOf(needle, offset)) >= 0) { count += 1; offset = found + needle.length; }
        return count;
    },
    render: function (doc, data, tokens, root) {
        data = this.validateData(data); this.checkStyles(doc);
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Association Profile requires one fresh document page"); }
        var page = doc.pages.item(0), b = page.bounds, pt = SHAN.utils.pt, layout = tokens.layout;
        var titleX = b[1] + pt(layout.title_left_mm), frames = [], copyFrames = [], endingFrames = [], lines = [], logo = null;
        var i, field, frame, x, width, y;
        page.appliedMaster = doc.masterSpreads.itemByName("I-FRONT");
        frame = this.addTextFrame(doc, page,
            [b[0] + pt(layout.title_top_mm), titleX, b[0] + pt(layout.title_top_mm + layout.title_height_mm), titleX + pt(layout.title_width_mm)],
            "P_Association_Title", data.title, "SHAN_ASSOCIATION:" + data.id + ":title");
        frames.push(frame); copyFrames.push(frame);
        lines.push(this.addRule(doc, page,
            [b[0] + pt(layout.accent_top_mm), titleX, b[0] + pt(layout.accent_top_mm), titleX + pt(layout.accent_length_mm)],
            "C_SDU_RED", layout.accent_weight_pt, "SHAN_ASSOCIATION:" + data.id + ":title_accent"));
        for (i = 0; i < data.fields.length; i += 1) {
            field = data.fields[i];
            if (i < 2) {
                x = b[1] + pt(i === 0 ? layout.name_x_mm : layout.logo_x_mm);
                y = b[0] + pt(layout.info_top_mm);
                width = pt(i === 0 ? layout.name_width_mm : layout.logo_width_mm);
            } else {
                x = b[1] + pt(layout.meta_x_mm[i - 2]);
                y = b[0] + pt(layout.meta_top_mm);
                width = pt(layout.meta_width_mm[i - 2]);
            }
            lines.push(this.addRule(doc, page, [y, x, y, x + width], i === 0 ? "C_SDU_RED" : "C_LINE",
                i === 0 ? layout.info_accent_weight_pt : layout.meta_rule_weight_pt,
                "SHAN_ASSOCIATION:" + data.id + ":field_rule:" + (i + 1)));
            frame = this.addTextFrame(doc, page, [y + pt(layout.label_offset_mm), x,
                    y + pt(layout.label_offset_mm + layout.label_height_mm), x + width],
                "P_Association_Label", field.label, "SHAN_ASSOCIATION:" + data.id + ":label:" + (i + 1));
            frames.push(frame); copyFrames.push(frame);
            if (field.type === "image") {
                var logoX = b[1] + pt(layout.logo_x_mm), logoY = b[0] + pt(layout.logo_top_mm);
                logo = this.placeLogo(doc, page, [logoY, logoX, logoY + pt(layout.logo_width_mm), logoX + pt(layout.logo_width_mm)],
                    File(root + "/" + field.value), "SHAN_ASSOCIATION:" + data.id + ":logo");
            } else {
                frame = this.addTextFrame(doc, page, [y + pt(layout.value_offset_mm), x,
                        y + pt(layout.value_offset_mm + layout.value_height_mm), x + width],
                    i === 0 ? "P_Association_Name" : "P_Association_Value", field.value,
                    "SHAN_ASSOCIATION:" + data.id + ":value:" + (i + 1));
                frames.push(frame); copyFrames.push(frame);
            }
        }
        var bodyX = b[1] + pt(layout.body_left_mm), bodyY = b[0] + pt(layout.lead_top_mm);
        var ruleX = b[1] + pt(layout.lead_rule_x_mm);
        lines.push(this.addRule(doc, page, [bodyY, ruleX, bodyY + pt(layout.lead_rule_length_mm), ruleX],
            "C_SDU_RED", layout.lead_rule_weight_pt, "SHAN_ASSOCIATION:" + data.id + ":lead_rule"));
        frame = this.addTextFrame(doc, page, [bodyY, bodyX,
                bodyY + pt(layout.lead_height_mm), bodyX + pt(layout.body_width_mm)],
            "P_Association_Lead", data.body[0], "SHAN_ASSOCIATION:" + data.id + ":lead");
        frames.push(frame); copyFrames.push(frame);
        bodyY = b[0] + pt(layout.body_top_mm);
        frame = this.addTextFrame(doc, page, [bodyY, bodyX, bodyY + pt(layout.body_height_mm), bodyX + pt(layout.body_width_mm)],
            "P_Association_Body", data.body[1], "SHAN_ASSOCIATION:" + data.id + ":body");
        frames.push(frame); copyFrames.push(frame);
        var ending = tokens.ending, endingX = b[1] + pt(layout.ending_left_mm);
        frame = this.addTextFrame(doc, page,
            [b[0] + pt(layout.year_top_mm), endingX, b[0] + pt(layout.year_top_mm + layout.year_height_mm),
                endingX + pt(layout.ending_width_mm)],
            "P_Association_Year", ending.year_text, "SHAN_ASSOCIATION:" + data.id + ":year");
        frame.parentStory.texts.item(0).fillTint = ending.year_tint_percent;
        frames.push(frame); endingFrames.push(frame);
        x = endingX + pt((layout.ending_width_mm - layout.ending_rule_length_mm) / 2);
        lines.push(this.addRule(doc, page,
            [b[0] + pt(layout.ending_rule_top_mm), x, b[0] + pt(layout.ending_rule_top_mm),
                x + pt(layout.ending_rule_length_mm)],
            "C_SDU_RED", layout.ending_rule_weight_pt, "SHAN_ASSOCIATION:" + data.id + ":ending_rule"));
        frame = this.addTextFrame(doc, page,
            [b[0] + pt(layout.anniversary_top_mm), endingX,
                b[0] + pt(layout.anniversary_top_mm + layout.anniversary_height_mm), endingX + pt(layout.ending_width_mm)],
            "P_Association_Anniversary", ending.caption_text, "SHAN_ASSOCIATION:" + data.id + ":anniversary");
        frames.push(frame); endingFrames.push(frame);
        doc.recompose();
        var overset = false;
        for (i = 0; i < frames.length; i += 1) { if (frames[i].overflows) { overset = true; } }
        doc.insertLabel("SHAN_ASSOCIATION_PROFILE_REPORT", "article=" + data.id + "; pages=" + doc.pages.length +
            "; textFrames=" + frames.length + "; logo=" + (logo ? 1 : 0) + "; year=1; anniversary=1; overset=" + overset);
        return { page: page, textFrames: frames, copyFrames: copyFrames, endingFrames: endingFrames,
            logo: logo, lines: lines, overset: overset };
    },
    assertRendered: function (doc, result, data, tokens) {
        var i, frame, fb, pb = result.page.bounds, intersects = false, actual = [], visibleCharacters = 0;
        if (doc.pages.length !== 1 || result.textFrames.length < 1) { throw new Error("Association Profile page/textFrames assertion failed"); }
        for (i = 0; i < result.textFrames.length; i += 1) {
            frame = result.textFrames[i]; fb = frame.geometricBounds;
            if (fb[2] > pb[0] && fb[0] < pb[2] && fb[3] > pb[1] && fb[1] < pb[3]) { intersects = true; }
            if (!frame.itemLayer.visible) { throw new Error("Association Profile text is on a hidden layer"); }
            visibleCharacters += String(frame.parentStory.contents).replace(/\s/g, "").length;
            if (frame.overflows) { throw new Error("Association Profile text frame overset"); }
        }
        for (i = 0; i < result.copyFrames.length; i += 1) { actual.push(this.normalizeText(result.copyFrames[i].parentStory.contents)); }
        if (!intersects || visibleCharacters <= 150) { throw new Error("Association Profile has no visible page text"); }
        if (actual.join("\n") !== this.visibleText(data)) { throw new Error("Association Profile visible copy differs from locked JSON"); }
        var allStoryText = "", yearText = tokens.ending.year_text, captionText = tokens.ending.caption_text;
        for (i = 0; i < doc.stories.length; i += 1) { allStoryText += String(doc.stories.item(i).contents) + "\n"; }
        if (result.endingFrames.length !== 2 || this.countOccurrences(allStoryText, yearText) !== 1 ||
                this.countOccurrences(allStoryText, captionText) !== 1) {
            throw new Error("Association Profile anniversary ending assertion failed");
        }
        var graphic = this.getFirstGraphic(result.logo);
        if (!result.logo || !result.logo.itemLayer.visible || !graphic || !graphic.itemLink ||
                !graphic.itemLink.isValid) { throw new Error("Association Profile logo is missing or hidden"); }
        fb = result.logo.geometricBounds;
        if (!(fb[2] > pb[0] && fb[0] < pb[2] && fb[3] > pb[1] && fb[1] < pb[3])) { throw new Error("Association Profile logo is outside the document page"); }
        var logoWidth = (fb[3] - fb[1]) / SHAN.utils.pt(1);
        if (logoWidth < 20 || logoWidth > 24 || logoWidth > tokens.layout.logo_max_width_mm) { throw new Error("Association Profile logo width out of bounds"); }
        if (result.overset || doc.extractLabel("SHAN_ASSOCIATION_PROFILE_REPORT").indexOf("overset=false") < 0) {
            throw new Error("Association Profile overset assertion failed");
        }
        return { pages: doc.pages.length, textFrames: result.textFrames.length,
            visibleCharacters: visibleCharacters, logoWidthMM: logoWidth, overset: result.overset };
    }
};
