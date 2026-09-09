/* Chapter only. ES3; manifest JSON is data, never executable code. */
var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.chapter = {
    // ExtendScript hosts need not provide JSON.parse. Parse without eval.
    parseJSON: function (source) {
        var at = 0;
        function fail() { throw new Error("Invalid manifest JSON at character " + at); }
        function white() { while (/[\x20\t\r\n]/.test(source.charAt(at)) && at < source.length) { at += 1; } }
        function string() {
            var result = "", c, hex;
            at += 1;
            while (at < source.length) {
                c = source.charAt(at++);
                if (c === '"') { return result; }
                if (c === "\\") {
                    c = source.charAt(at++);
                    if (c === "u") {
                        hex = source.substr(at, 4);
                        if (!/^[0-9a-fA-F]{4}$/.test(hex)) { fail(); }
                        result += String.fromCharCode(parseInt(hex, 16)); at += 4;
                    } else if (c === '"' || c === "\\" || c === "/") { result += c; }
                    else if (c === "b") { result += "\b"; }
                    else if (c === "f") { result += "\f"; }
                    else if (c === "n") { result += "\n"; }
                    else if (c === "r") { result += "\r"; }
                    else if (c === "t") { result += "\t"; }
                    else { fail(); }
                } else { if (c.charCodeAt(0) < 32) { fail(); } result += c; }
            }
            fail();
        }
        function value(depth) {
            var c, out, key, seen, match;
            if (depth > 32) { fail(); }
            white(); c = source.charAt(at);
            if (c === '"') { return string(); }
            if (c === "{" || c === "[") {
                at += 1; out = c === "{" ? {} : []; seen = {};
                white();
                if (source.charAt(at) === (c === "{" ? "}" : "]")) { at += 1; return out; }
                while (at < source.length) {
                    white();
                    if (c === "{") {
                        if (source.charAt(at) !== '"') { fail(); }
                        key = string();
                        if (key === "__proto__" || key === "constructor" || key === "prototype" || seen["$" + key]) { fail(); }
                        seen["$" + key] = true;
                        white(); if (source.charAt(at++) !== ":") { fail(); }
                        out[key] = value(depth + 1);
                    } else { out.push(value(depth + 1)); }
                    white(); key = source.charAt(at++);
                    if (key === (c === "{" ? "}" : "]")) { return out; }
                    if (key !== ",") { fail(); }
                }
                fail();
            }
            match = /^(true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(source.substring(at));
            if (!match) { fail(); }
            at += match[0].length;
            if (match[0] === "true") { return true; }
            if (match[0] === "false") { return false; }
            if (match[0] === "null") { return null; }
            out = Number(match[0]); if (!isFinite(out)) { fail(); } return out;
        }
        source = source.replace(/^\uFEFF/, "");
        var result = value(0);
        white(); if (at !== source.length) { fail(); }
        return result;
    },
    validate: function (manifest) {
        var sections = manifest && manifest.sections, i, j, section, seen = {};
        var fields = ["id", "cn", "en", "intro"];
        if (!(sections instanceof Array) || sections.length !== 7) { throw new Error("Chapter requires exactly 7 sections"); }
        for (i = 0; i < sections.length; i += 1) {
            section = sections[i];
            if (!section || typeof section !== "object") { throw new Error("Invalid section " + i); }
            for (j = 0; j < fields.length; j += 1) {
                if (!section.hasOwnProperty(fields[j]) || typeof section[fields[j]] !== "string" || !/\S/.test(section[fields[j]])) {
                    throw new Error("Section " + i + " missing/invalid " + fields[j]);
                }
            }
            if (!/^[a-z][a-z0-9_-]*$/.test(section.id) || seen["$" + section.id]) { throw new Error("Invalid/duplicate section id: " + section.id); }
            seen["$" + section.id] = true;
            if (!section.hasOwnProperty("chapter_index") || section.chapter_index !== (i === 0 ? null : i)) {
                throw new Error("Invalid chapter_index in " + section.id);
            }
        }
        return sections;
    },
    readManifest: function (file) {
        if (!file.exists) { throw new Error("Manifest not found: " + file.fsName); }
        file.encoding = "UTF-8";
        if (!file.open("r")) { throw new Error("Cannot open manifest: " + file.fsName); }
        var text;
        try { text = file.read(); } finally { file.close(); }
        var manifest = this.parseJSON(text);
        this.validate(manifest);
        return manifest;
    },
    addFrame: function (doc, page, section, field, styleName, bounds) {
        var frame = page.textFrames.add();
        frame.label = "SHAN_CHAPTER:" + section.id + ":" + field;
        frame.appliedObjectStyle = doc.objectStyles.item(0);
        frame.fillColor = doc.swatches.item(0);
        frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1;
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.geometricBounds = bounds;
        frame.contents = String(section[field]);
        frame.parentStory.paragraphs.everyItem().appliedParagraphStyle = doc.paragraphStyles.itemByName(styleName);
    },
    create: function (doc, manifest, context) {
        var sections = this.validate(manifest), i, j, page, section, bounds, left, right, top, bottom, step;
        var parent = doc.masterSpreads.itemByName("H-CHAPTER");
        var styles = ["P_Chapter_Number", "P_Section_Title_CN", "P_Section_Title_EN", "P_Chapter_Intro"];
        var fields = ["chapter_index", "cn", "en", "intro"];
        if (!parent.isValid) { throw new Error("Missing H-CHAPTER Parent"); }
        for (i = 0; i < styles.length; i += 1) {
            if (!doc.paragraphStyles.itemByName(styles[i]).isValid) { throw new Error("Missing style: " + styles[i]); }
        }
        if (doc.pages.length !== 1 || doc.pages.item(0).textFrames.length !== 0) { throw new Error("Chapter requires a fresh Foundation document"); }
        var pt = SHAN.utils.pt, margins = SHAN.spec.marginsMM;
        for (i = 0; i < sections.length; i += 1) {
            section = sections[i];
            page = i === 0 ? doc.pages.item(0) : doc.pages.add(LocationOptions.AT_END);
            page.appliedMaster = parent;
            page.label = "SHAN_CHAPTER:" + section.id;
            SHAN.document.applyMargins(page.marginPreferences);
            bounds = page.bounds;
            left = bounds[1] + pt(page.side === PageSideOptions.LEFT_HAND ? margins.outside : margins.inside);
            right = left + pt(SHAN.utils.moduleWidthMM() * SHAN.spec.columns + SHAN.spec.gutterMM * (SHAN.spec.columns - 1));
            top = bounds[0] + pt(margins.top); bottom = bounds[2] - pt(margins.bottom);
            // TODO: DESIGN VALUE — 仅以四个等高结构容器承载字段；最终字号、字体、位置和装饰待批准。
            // 容器横向占六模块，纵向仅划分可用边距区域，不修改任何段落样式。
            step = (bottom - top) / fields.length;
            for (j = 0; j < fields.length; j += 1) {
                if (j === 0 && section.chapter_index === null) { continue; }
                this.addFrame(doc, page, section, fields[j], styles[j], [top + step * j, left, top + step * (j + 1), right]);
            }
        }
        doc.insertLabel("SHAN_SCOPE", "Chapter structural test; final page count undecided");
        SHAN.utils.warn(context, "Chapter 仅完成结构；标题字体、字号、最终位置与装饰尚待批准。请检查文字溢出，不将此文档视为视觉定稿。");
    }
};
