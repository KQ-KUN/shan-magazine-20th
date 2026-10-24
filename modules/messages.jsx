var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.messages = {
    check: function (value, message) { if (!value) { throw new Error("Messages V2: " + message); } },
    at: function (items, i) {
        if (!items || items.length <= i) { return null; }
        var value = items[i];
        return value && value.getElements ? value.getElements()[0] : value;
    },
    text: function (paragraph) {
        var value = String(paragraph.contents);
        return value.charAt(value.length - 1) === "\r" ? value.substring(0, value.length - 1) : value;
    },
    entry: function (data, map) {
        var raw = data.paragraphs[map.header_paragraph - 1];
        return {name: raw.substring(map.name_range[0], map.name_range[1]), role: raw.substring(map.role_range[0], map.role_range[1])};
    },
    styleFor: function (index, starts, rows, centered, noIndent) {
        // ExtendScript's unparenthesized nested conditional is left-associative.
        // Use explicit branches so a Header can never become an Empty paragraph.
        if (starts["$" + index] > 0) { return "P_Message_Header"; }
        if (centered && centered["$" + index]) { return "P_Message_InternalTitle"; }
        if (noIndent && noIndent["$" + index]) { return "P_Message_Riddle"; }
        if (rows[index] === "") { return "P_Message_Empty"; }
        return "P_Message_Body";
    },
    clearOutput: function (doc) {
        for (var i = doc.pages.length - 1; i >= 0; i -= 1) {
            var items = doc.pages[i].pageItems;
            for (var j = items.length - 1; j >= 0; j -= 1) {
                if (/^SHAN_MESSAGE/.test(items[j].label)) { items[j].remove(); }
            }
        }
    },
    frame: function (doc, page, label, x, y, width, height) {
        var f = page.textFrames.add(), pt = SHAN.utils.pt, b = page.bounds;
        f.label = label; f.appliedObjectStyle = doc.objectStyles[0];
        f.fillColor = doc.swatches[0]; f.strokeColor = doc.swatches[0];
        f.textFramePreferences.insetSpacing = [0, 0, 0, 0]; f.textFramePreferences.textColumnCount = 1;
        f.textFramePreferences.autoSizingType = AutoSizingTypeEnum.OFF;
        f.geometricBounds = [b[0] + pt(y), b[1] + pt(x), b[0] + pt(y + height), b[1] + pt(x + width)];
        return f;
    },
    addPage: function (doc, frames, t, first) {
        var page = doc.pages.length === 1 && frames.length === 0 ? doc.pages[0] : doc.pages.add(LocationOptions.AT_END);
        page.appliedMaster = doc.masterSpreads.itemByName(t.parent);
        var top = first ? t.first_top_mm : t.continuation_top_mm, left = page.side === PageSideOptions.LEFT_HAND ? 15 : 18;
        for (var col = 0; col < 2; col += 1) {
            var f = this.frame(doc, page, "SHAN_MESSAGES_V2_FLOW:" + frames.length, left + col * (t.column_width_mm + t.gutter_mm), top, t.column_width_mm, t.bottom_mm - top);
            if (frames.length) { frames[frames.length - 1].nextTextFrame = f; }
            frames.push(f);
        }
        return page;
    },
    measureText: function (doc, text, size, isName) {
        var f = this.frame(doc, doc.pages[0], "SHAN_MESSAGES_MEASURE", 0, 0, 152, 25);
        try {
            f.contents = text; var p = f.parentStory.paragraphs[0];
            p.applyParagraphStyle(doc.paragraphStyles.itemByName("P_Message_Header"), true);
            p.spaceBefore = 0; p.spaceAfter = 0; p.firstLineIndent = 0; p.keepWithNext = 0;
            if (isName) { p.characters.everyItem().appliedCharacterStyle = doc.characterStyles.itemByName("C_Message_Name"); }
            p.pointSize = size; doc.recompose();
            this.check(!f.overflows && p.lines.length === 1, "Header measurement failed " + text);
            var first = this.at(p.characters, 0), last = this.at(p.characters, p.characters.length - 1);
            this.check(first && last, "Missing header measurement glyph " + text);
            return last.endHorizontalOffset - first.horizontalOffset;
        } finally { f.remove(); }
    },
    formatHeader: function (doc, story, index, e, t) {
        var pt = SHAN.utils.pt, size = t.name_size_pt, width, roleWidth = this.measureText(doc, e.role, t.styles.P_Message_Header.size_pt, false);
        var padding = pt(t.name_padding_mm[1]), gap = pt(t.role_gap_mm), columnWidth = pt(t.column_width_mm);
        do {
            width = this.measureText(doc, e.name, size, true);
            if (padding * 2 + pt(t.plate_offset_mm[0]) + width + gap + roleWidth <= columnWidth + .1) { break; }
            size -= t.name_size_step_pt;
        } while (size >= t.name_min_size_pt);
        this.check(size >= t.name_min_size_pt, "Header cannot fit legibly " + e.name);
        var p = this.at(story.paragraphs, index);
        // Mixed CJK sizes otherwise inherit em-box alignment from host text defaults.
        p.characters.everyItem().characterAlignment = CharacterAlignment.ALIGN_BASELINE;
        p.characters.everyItem().baselineShift = 0;
        p.characters.itemByRange(0, e.name.length - 1).appliedCharacterStyle = doc.characterStyles.itemByName("C_Message_Name");
        p.characters.itemByRange(0, e.name.length - 1).pointSize = size;
        for (var i = p.tabStops.length - 1; i >= 0; i -= 1) { p.tabStops[i].remove(); }
        p.tabStops.add({alignment: TabStopAlignment.LEFT_ALIGN, position: width + 2 * padding + pt(t.plate_offset_mm[0]) + gap});
        return {name_size_pt: size, name_width_pt: width, role_width_pt: roleWidth};
    },
    centerHeader: function (doc, story, index, e) {
        // Baseline/ascent are unavailable while a header is still in overset.
        // Resolve metrics only after all source text has real document frames.
        doc.recompose(); var p = this.at(story.paragraphs, index);
        var nameGlyph = this.at(p.characters, 0), roleGlyph = this.at(p.characters, e.name.length + 1);
        this.check(nameGlyph && roleGlyph, "Missing centering metrics " + e.name);
        var nameCenter = nameGlyph.baseline + (nameGlyph.descent - nameGlyph.ascent) / 2;
        var roleCenter = roleGlyph.baseline + (roleGlyph.descent - roleGlyph.ascent) / 2;
        p.characters.itemByRange(e.name.length + 1, e.name.length + e.role.length).baselineShift = roleCenter - nameCenter;
    },
    lineRecord: function (line, frames) {
        var owners = line.parentTextFrames, frame = this.at(owners, 0);
        this.check(frame && frame.isValid !== false, "Line has no valid frame");
        var page = frame.parentPage;
        this.check(page && page.isValid !== false, "Line has no document page");
        var frameIndex = -1;
        for (var i = 0; i < frames.length; i += 1) { if (frames[i].id === frame.id) { frameIndex = i; break; } }
        this.check(frameIndex >= 0, "Line resolved outside Messages story");
        return {text: String(line.contents), frame_index: frameIndex, page_index: Math.floor(frameIndex / 2) + 1, page: Number(page.name), column: frameIndex % 2,
            baseline_pt: line.baseline, frame_id: frame.id};
    },
    paletteFor: function (role, t) {
        var year = parseInt(role.substring(0, 4), 10), index = 0;
        while (index < t.palette_year_breaks.length && year >= t.palette_year_breaks[index]) { index += 1; }
        return t.palettes[index];
    },
    plate: function (doc, page, id, layer, bounds, color) {
        var rect = page.rectangles.add(); rect.appliedObjectStyle = doc.objectStyles[0];
        rect.label = "SHAN_MESSAGES_OVERPRINT:" + id + ":" + layer;
        rect.geometricBounds = bounds; rect.fillColor = doc.colors.itemByName(color); rect.fillTint = 100;
        // None last: the host's default object style can otherwise restore a stroke.
        rect.strokeWeight = 0; rect.strokeColor = doc.swatches.itemByName("None"); rect.sendToBack();
        return rect;
    },
    decorate: function (doc, p, e, id, t, frames) {
        this.check(p.lines.length === 1, "Name/role header wrapped " + e.name);
        var first = this.at(p.characters, 0), last = this.at(p.characters, e.name.length - 1), role = this.at(p.characters, e.name.length + 1);
        this.check(first && last && role, "Header glyph access " + e.name);
        var line = this.at(p.lines, 0), info = this.lineRecord(line, frames), page = frames[info.frame_index].parentPage, b = page.bounds, pt = SHAN.utils.pt;
        var x1 = first.horizontalOffset - pt(t.name_padding_mm[1]), x2 = last.endHorizontalOffset + pt(t.name_padding_mm[1]);
        var inkTop = first.baseline - first.ascent, inkBottom = first.baseline + first.descent;
        var height = (inkBottom - inkTop) * t.plate_height_ratio, y2 = inkBottom, y1 = y2 - height;
        var dx = pt(t.plate_offset_mm[0]), dy = pt(t.plate_offset_mm[1]);
        var nc = first.baseline + (first.descent - first.ascent) / 2, rc = role.baseline + (role.descent - role.ascent) / 2;
        this.check(role.horizontalOffset >= x2 + dx + pt(t.role_gap_mm) - .3, "Role overlaps name plates " + e.name);
        this.check(Math.abs(rc - nc) < .2, "Role/name visual centers differ " + e.name + ": " + (rc-nc));
        var palette = this.paletteFor(e.role,t), primary = [y1,x1,y2,x2], shadow = [y1+dy,x1+dx,y2+dy,x2+dx];
        this.plate(doc,page,id,"primary",primary,"C_Message_"+palette.name+"_primary");
        this.plate(doc,page,id,"shadow",shadow,"C_Message_"+palette.name+"_shadow");
        this.check(x1 >= b[1] + pt(14.5) && x2+dx <= b[1] + pt(171), "Name plates outside live area " + e.name);
        var mm = function (g) { return [(g[0]-b[0])/pt(1),(g[1]-b[1])/pt(1),(g[2]-b[0])/pt(1),(g[3]-b[1])/pt(1)]; };
        return {page:info.page,page_index:info.page_index,column:info.column,frame_index:info.frame_index,same_line:true,solid_fill:true,
            palette:palette.name,primary_rgb:palette.primary,shadow_rgb:palette.shadow,rect_mm:mm(primary),shadow_rect_mm:mm(shadow),
            plate_height_ratio:t.plate_height_ratio,offset_mm:t.plate_offset_mm,name_size_pt:first.pointSize,role_size_pt:role.pointSize,
            name_center_pt:nc,role_center_pt:rc,name_start_pt:first.horizontalOffset,name_end_pt:last.endHorizontalOffset,
            role_start_pt:role.horizontalOffset,baseline_pt:first.baseline};
    },
    render: function (doc, data, map, t, runtime) {
        this.clearOutput(doc);
        while (doc.pages.length > 1) { doc.pages[doc.pages.length - 1].remove(); }
        var frames = [], rows = data.paragraphs.slice(0), starts = {}, centered = {}, noIndent = {}, i, j, e, m, formats = [];
        for (i = 0; i < map.entries.length; i += 1) {
            m = map.entries[i]; e = this.entry(data, m); starts["$" + (m.header_paragraph - 1)] = i + 1; rows[m.header_paragraph - 1] = e.name + "\t" + e.role;
        }
        for (i = 0; i < map.centered_titles.length; i += 1) { centered["$" + (map.centered_titles[i].source_paragraph-1)] = true; }
        for (i = 0; i < map.no_indent_paragraphs.length; i += 1) { noIndent["$" + (map.no_indent_paragraphs[i]-1)] = true; }
        runtime.setStage("create-messages-threaded-story"); this.addPage(doc, frames, t, true);
        var story = frames[0].parentStory; story.contents = rows.join("\r") + "\r";
        this.check(story.paragraphs.length === data.paragraphs.length, "Source paragraph count changed");
        for (i = 0; i < rows.length; i += 1) {
            var p = this.at(story.paragraphs, i), header = (starts["$" + i] > 0);
            p.applyParagraphStyle(doc.paragraphStyles.itemByName(this.styleFor(i, starts, rows, centered, noIndent)), true);
            if (i === 0) { p.spaceBefore = 0; }
        }
        for (i = 0; i < map.double_underlines.length; i += 1) {
            var um = map.double_underlines[i];
            p = this.at(story.paragraphs,um.source_paragraph-1);
            p.characters.itemByRange(um.start,um.end-1).appliedCharacterStyle = doc.characterStyles.itemByName(um.character_style);
        }
        // Complete paragraph mapping before any header measurement triggers recomposition.
        // Resolve each header again after that pass; never keep a live paragraph specifier across it.
        for (i = 0; i < map.entries.length; i += 1) {
            m = map.entries[i]; e = this.entry(data, m);
            p = story.paragraphs[m.header_paragraph - 1];
            p.applyParagraphStyle(doc.paragraphStyles.itemByName("P_Message_Header"), true);
            if (i === 0) { p.spaceBefore = 0; }
            runtime.setStage("format-message-header", {name:e.name,source_paragraph:m.header_paragraph});
            formats.push(this.formatHeader(doc, story, m.header_paragraph - 1, e, t));
        }
        var titlePage = doc.pages[0], left = titlePage.side === PageSideOptions.LEFT_HAND ? 15 : 18;
        var title = this.frame(doc, titlePage, "SHAN_MESSAGES_TITLE", left, 20, 120, 15);
        title.contents = "寄语"; title.parentStory.paragraphs[0].applyParagraphStyle(doc.paragraphStyles.itemByName("P_Messages_Title"), true);
        doc.recompose(); var previous = -1, stalled = 0;
        while (story.overflows) {
            runtime.setStage("messages-flow", {document_pages: doc.pages.length, last_frame: frames[frames.length-1].label});
            this.check(doc.pages.length < 20, "Flow exceeded safe page limit");
            var visible = 0;
            for (i = 0; i < frames.length; i += 1) { visible += frames[i].characters.length; }
            stalled = visible <= previous ? stalled + 1 : 0; this.check(stalled < 2, "No progress while flowing Messages"); previous = visible;
            this.addPage(doc, frames, t, false); doc.recompose();
        }
        while (frames.length > 2 && frames[frames.length-2].characters.length === 0 && frames[frames.length-1].characters.length === 0) {
            frames.pop(); frames.pop(); doc.pages[doc.pages.length-1].remove(); doc.recompose();
        }
        runtime.setStage("center-placed-message-headers");
        for (i = 0; i < map.entries.length; i += 1) {
            m = map.entries[i]; e = this.entry(data,m);
            this.centerHeader(doc,story,m.header_paragraph-1,e);
        }
        doc.recompose();
        if (t.last_page_balance) {
            // Balance the closing spread through the same linked story, not per-person blocks.
            runtime.setStage("balance-messages-closing-spread");
            var count = Math.min(t.tail_balance_pages * 2, frames.length), begin = frames.length - count, original = [], lo = .1, hi = 1, ratio, k;
            for (i = begin; i < frames.length; i += 1) { original.push(frames[i].geometricBounds); }
            for (i = 0; i < 14; i += 1) {
                ratio = (lo + hi) / 2;
                for (k = 0; k < count; k += 1) { var g = original[k]; frames[begin+k].geometricBounds = [g[0],g[1],g[0]+(g[2]-g[0])*ratio,g[3]]; }
                doc.recompose(); if (story.overflows) { lo=ratio; } else { hi=ratio; }
            }
            for (k = 0; k < count; k += 1) { g=original[k]; frames[begin+k].geometricBounds=[g[0],g[1],Math.min(g[2],g[0]+(g[2]-g[0])*hi+SHAN.utils.pt(1)),g[3]]; }
            doc.recompose();
        }
        this.check(!story.overflows, "Final story overset"); runtime.setStage("messages-paragraph-integrity");
        var paragraphs = [], entries = [], allLines = [];
        for (i = 0; i < rows.length; i += 1) {
            p = this.at(story.paragraphs, i); var expectedStyle = this.styleFor(i, starts, rows, centered, noIndent);
            this.check(p.appliedParagraphStyle.name === expectedStyle, "Unexpected paragraph style " + (i+1) + ": actual=" + p.appliedParagraphStyle.name + "; expected=" + expectedStyle); this.check(this.text(p) === rows[i], "Changed source paragraph " + (i+1));
            if (noIndent["$" + i]) { this.check(Math.abs(Number(p.firstLineIndent)) < 0.01, "Riddle indent not zero " + (i+1)); }
            var lines = [], ls = p.lines; this.check(ls && ls.length > 0, "Invisible source paragraph " + (i+1));
            for (j = 0; j < ls.length; j += 1) { var lineInfo = this.lineRecord(this.at(ls,j), frames); lines.push(lineInfo); allLines.push(lineInfo); }
            paragraphs.push({source_paragraph:i+1, text:rows[i], lines:lines, style:p.appliedParagraphStyle.name, keep_all_lines:p.keepAllLinesTogether,first_line_indent_pt:Number(p.firstLineIndent)});
        }
        for (i = 0; i < map.entries.length; i += 1) {
            m = map.entries[i]; e = this.entry(data,m); p = this.at(story.paragraphs,m.header_paragraph-1);
            runtime.setStage("decorate-message-name", {entry:m.id,name:e.name,source_paragraph:m.header_paragraph});
            var decoration = this.decorate(doc,p,e,m.id,t,frames), bodyLines = [], bodyRows = [], reconstructed = e.role + " " + e.name;
            this.check(reconstructed === data.paragraphs[m.header_paragraph-1], "Header reconstruction " + e.name);
            for (j = 0; j < m.body_paragraphs.length; j += 1) {
                var pr = paragraphs[m.body_paragraphs[j]-1]; bodyRows.push(pr.text);
                if (pr.text !== "") { bodyLines = bodyLines.concat(pr.lines); }
            }
            // A complete one-line message has only one body line to keep (new source includes this case).
            this.check(bodyLines.length > 0, "Missing message body " + e.name);
            for (var keep = 0; keep < Math.min(t.header_keep_body_lines,bodyLines.length); keep += 1) {
                this.check(bodyLines[keep].frame_index === decoration.frame_index, "Header detached from body opening " + e.name);
            }
            var flowFrames = [], flowPages = [];
            for (j = 0; j < bodyLines.length; j += 1) {
                var fr = bodyLines[j].frame_index, pg = bodyLines[j].page_index;
                if (flowFrames.length === 0 || flowFrames[flowFrames.length-1] !== fr) { flowFrames.push(fr); }
                if (flowPages.length === 0 || flowPages[flowPages.length-1] !== pg) { flowPages.push(pg); }
            }
            entries.push({id:m.id,index:i,name:e.name,role:e.role,header_paragraph:m.header_paragraph,header_reconstructed:reconstructed,
                body_paragraphs:m.body_paragraphs,body:bodyRows,header:decoration,format:formats[i],frames:flowFrames,pages:flowPages,
                crosses_columns:flowFrames.length>1,crosses_pages:flowPages.length>1,body_lines:bodyLines});
        }
        var sourceFormatting = [];
        for (i = 0; i < map.centered_titles.length; i += 1) {
            var cm = map.centered_titles[i]; runtime.setStage("validate-source-centered-title",{source_paragraph:cm.source_paragraph}); p = this.at(story.paragraphs,cm.source_paragraph-1);
            this.check(p.justification === Justification.CENTER_ALIGN,"Source title not centered " + cm.source_paragraph);
            var following = [], next = cm.source_paragraph;
            while(next < paragraphs.length && following.length < 2) {
                if(paragraphs[next].text !== "") { following = following.concat(paragraphs[next].lines); }
                next += 1;
            }
            this.check(following.length > 0,"Title missing following body");
            for(j=0;j<Math.min(2,following.length);j+=1){this.check(following[j].frame_index===paragraphs[cm.source_paragraph-1].lines[0].frame_index,"Internal title detached from body " + cm.source_paragraph);}
            sourceFormatting.push({kind:"centered-title",source_paragraph:cm.source_paragraph,text:this.text(p),centered:true,lines:paragraphs[cm.source_paragraph-1].lines});
        }
        for (i = 0; i < map.double_underlines.length; i += 1) {
            um=map.double_underlines[i];p=this.at(story.paragraphs,um.source_paragraph-1);
            runtime.setStage("validate-source-double-underline",{source_paragraph:um.source_paragraph,start:um.start,end:um.end});
            var firstGlyph=this.at(p.characters,um.start), lastGlyph=this.at(p.characters,um.end-1), underlinedText="";
            // Character ranges expose array-valued properties in InDesign 2026.
            // Validate concrete glyphs instead of comparing that array to boolean true.
            for(j=um.start;j<um.end;j+=1){
                var glyph=this.at(p.characters,j);this.check(glyph && glyph.underline===true,"Source double underline missing at character "+j);
                var glyphStroke=glyph.underlineType;this.check(glyphStroke && glyphStroke.isValid!==false,"Double underline stroke unresolved");
                this.check(glyphStroke.name===doc.characterStyles.itemByName(um.character_style).underlineType.name,"Unexpected underline style");
                underlinedText+=String(glyph.contents);
            }
            var stroke=firstGlyph.underlineType;
            var lineInfo=this.lineRecord(this.at(p.lines,0),frames), owner=frames[lineInfo.frame_index], pageBounds=owner.parentPage.bounds;
            sourceFormatting.push({kind:"double-underline",source_paragraph:um.source_paragraph,text:underlinedText,stroke_style:stroke.name,
                start:um.start,end:um.end,line:lineInfo,offset_pt:firstGlyph.underlineOffset,weight_pt:firstGlyph.underlineWeight,
                x1_mm:(firstGlyph.horizontalOffset-pageBounds[1])/SHAN.utils.pt(1),x2_mm:(lastGlyph.endHorizontalOffset-pageBounds[1])/SHAN.utils.pt(1),
                baseline_mm:(firstGlyph.baseline-pageBounds[0])/SHAN.utils.pt(1)});
        }
        var fonts=doc.fonts; for(i=0;i<fonts.length;i+=1){this.check(fonts[i].status===FontStatus.INSTALLED,"Missing font "+fonts[i].name);}
        this.check(doc.links.length===0,"Unexpected media link");
        var frameReport=[];
        for(i=0;i<frames.length;i+=1){var f=frames[i],fb=f.geometricBounds,pb=f.parentPage.bounds;this.check(!f.overflows || i<frames.length-1,"Last frame overset");
            frameReport.push({index:i,page_index:Math.floor(i/2)+1,page:Number(f.parentPage.name),column:i%2,bounds_mm:[(fb[0]-pb[0])/SHAN.utils.pt(1),(fb[1]-pb[1])/SHAN.utils.pt(1),(fb[2]-pb[0])/SHAN.utils.pt(1),(fb[3]-pb[1])/SHAN.utils.pt(1)],characters:f.characters.length});}
        return {status:"PASS",pages:doc.pages.length,first_page:Number(doc.pages[0].name),people:entries.length,source_paragraphs:paragraphs.length,
            entries:entries,source_formatting:sourceFormatting,paragraphs:paragraphs,frames:frameReport,overset:false,fonts_installed:true,missing_links:false,native_version:app.version,
            story_id:story.id,story_paragraph_equality:true,header_transform:"role SPACE name -> name TAB role; only headers; reversible",body_normalization:"None; only terminal paragraph CR excluded from comparison"};
    }
};
