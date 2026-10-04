var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.assemblyV0 = {
    check: function (value, message) { if (!value) { throw new Error(message); } },
    read: function (root, path) {
        var file = File(root + "/" + path); file.encoding = "UTF-8";
        this.check(file.open("r"), "Cannot read " + path);
        try { return SHAN.chapter.parseJSON(file.read()); } finally { file.close(); }
    },
    write: function (path, value) {
        var file = File(path); file.encoding = "UTF-8";
        this.check(file.open("w"), "Cannot write " + path);
        try { this.check(file.write(value) !== false, "Write failed " + path); } finally { file.close(); }
    },
    // ES3 serializer: data only; no dependency on host JSON/eval.
    json: function (value) {
        var i, out = [], key;
        if (value === null || value === undefined) { return "null"; }
        if (typeof value === "string") {
            return '"' + value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"';
        }
        if (typeof value !== "object") { return String(value); }
        if (value instanceof Array) {
            for (i = 0; i < value.length; i += 1) { out.push(this.json(value[i])); }
            return "[" + out.join(",") + "]";
        }
        for (key in value) { if (value.hasOwnProperty(key) && typeof value[key] !== "function") { out.push(this.json(key) + ":" + this.json(value[key])); } }
        return "{" + out.join(",") + "}";
    },
    side: function (page) { return page.side === PageSideOptions.RIGHT_HAND ? "RIGHT_HAND" : "LEFT_HAND"; },
    number: function (doc, first) {
        var section = doc.sections.item(0);
        section.continueNumbering = false; section.pageNumberStart = first;
        doc.recompose();
    },
    fresh: function (context, first) {
        var doc = SHAN.document.create(context);
        this.number(doc, first);
        return doc;
    },
    validateSources: function (root, manifest) {
        var i, c;
        this.check(manifest.purpose === "REVIEW_PROOF_ONLY", "Wrong manifest purpose");
        this.check(manifest.cover.front.include_in_review_pdf && !manifest.cover.front.include_in_interior_master, "Cover scope");
        this.check(!manifest.cover.back.include && !manifest.cover.spine.include, "Back/spine excluded");
        this.check(File(root + "/" + manifest.cover.front.file).exists, "Approved cover missing");
        for (i = 0; i < manifest.interior.length; i += 1) {
            c = manifest.interior[i];
            if (c.source) { this.check(File(root + "/" + c.source).exists, c.id + " source missing"); }
            if (c.media_manifest) { this.check(File(root + "/" + c.media_manifest).exists, c.id + " media manifest missing"); }
            if (c.kind === "placeholder") { this.check(c.label === "CONTENT PENDING — NOT FOR PRINT" && c.pages === 1, "Pending placeholder contract"); }
        }
    },
    render: function (root, c, start, runtime) {
        var context = {warnings: [], document: null, runtime: runtime}, manifest, index = 0, i, doc, page, section;
        if (c.kind === "chapter") {
            manifest = this.read(root, "spec/CONTENT_MANIFEST.json");
            for (i = 0; i < manifest.sections.length; i += 1) { if (manifest.sections[i].id === c.section_id) { index = i; section = manifest.sections[i]; } }
            this.check(section, "Unknown chapter " + c.section_id);
        }
        // Number BEFORE Parents/renderer: changing parity afterwards would not realign frozen page-owned frames.
        doc = this.fresh(context, start - index); runtime.document = doc;
        this.check(this.side(doc.pages.item(0)) === ((start - index) % 2 ? "RIGHT_HAND" : "LEFT_HAND"), "Temp document first-page parity");
        if (c.kind === "placeholder") {
            page = doc.pages.item(0); page.appliedMaster = NothingEnum.NOTHING;
            var box = page.textFrames.add(); box.geometricBounds = ["25 mm", "18 mm", "70 mm", "167 mm"];
            box.contents = c.title + "\r" + c.label;
            box.parentStory.appliedFont = "Source Han Sans SC"; box.parentStory.pointSize = 12;
            return {doc: doc, first: 0, count: 1, warnings: []};
        }
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        var base = this.read(root, "spec/VISUAL_TOKENS.json"), tokens, media, result;
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        if (c.kind === "chapter") {
            SHAN.chapter.create(doc, manifest, context);
            page = doc.pages.item(index);
            this.check(page.label === "SHAN_CHAPTER:" + c.section_id, "Chapter label mismatch");
            return {doc: doc, first: index, count: 1, warnings: context.warnings};
        }
        if (c.kind === "interview") {
            SHAN.interviewSkin.apply(doc, base);
            SHAN.interview.create(doc, File(root + "/" + c.source), c.article_id, context);
        } else if (c.kind === "fiction") {
            tokens = this.read(root, "spec/FICTION_TOKENS.json");
            SHAN.fictionSkin.apply(doc, tokens, base, context);
            result = SHAN.fiction.create(doc, File(root + "/" + c.source), c.article_id);
            SHAN.publicationRefinements.fiction(doc,result,this.read(root,"content/FICTION_WORK_INFO.json"),c.id);
        } else if (c.kind === "memoir") {
            tokens = this.read(root, "spec/MEMOIR_TOKENS.json"); media = this.read(root, c.media_manifest);
            SHAN.memoirSkin.apply(doc, tokens, base, context);
            result = SHAN.memoir.create(doc, File(root + "/" + c.source), c.id === "memoir_gloomy" ? "memoir_gloomy_biologist_cry" : c.article_id,
                File(root + "/" + media.file), media.width_mm, media.height_mm);
            if(c.id === "memoir_pancake"){SHAN.publicationRefinements.pancake(doc,result,root,this.read(root,"content/TASK16_DISPLAY.json").pancake);}
        } else if (c.kind === "feature") {
            tokens = this.read(root, "spec/FEATURE_TOKENS.json"); media = this.read(root, c.media_manifest);
            SHAN.featureSkin.apply(doc, tokens, base, context);
            SHAN.feature.create(doc, File(root + "/" + c.source), c.article_id, media, root);
        } else if (c.kind === "front_note") {
            tokens = this.read(root, "spec/FRONT_NOTE_TOKENS.json"); SHAN.frontNoteSkin.apply(doc, tokens, base, context);
            result = SHAN.frontNote.create(doc, File(root + "/" + c.source), c.article_id, tokens, {hasSignature: false});
            SHAN.frontNote.assertRendered(doc, result, "写在《山》前", "而新的地层，仍在形成。");
        } else if (c.kind === "association_profile") {
            tokens = this.read(root, "spec/ASSOCIATION_PROFILE_TOKENS.json"); media = this.read(root, c.source);
            SHAN.associationProfileSkin.apply(doc, tokens, base, context);
            result = SHAN.associationProfile.render(doc, media, tokens, root);
            SHAN.associationProfile.assertRendered(doc, result, media, tokens);
        } else if (c.kind === "editorial_info") {
            tokens = this.read(root, "spec/EDITORIAL_INFO_TOKENS.json");
            SHAN.editorialInfoSkin.apply(doc, tokens, base, context);
            SHAN.editorialInfo.create(doc, root, tokens);
        } else if (c.kind === "xingyue") {
            tokens=this.read(root,"spec/XINGYUE_TOKENS.json");
            SHAN.xingyueSkin.apply(doc,tokens,base,context);SHAN.xingyue.create(doc,root,tokens,runtime);
        } else if (c.kind === "history") {
            tokens = this.read(root, "spec/HISTORY_TOKENS.json");
            var map = this.read(root, "content/HISTORY_IMPORT_MAP.json"), audit = this.read(root, "spec/HISTORY_SOURCE_AUDIT.json");
            manifest = this.read(root, "spec/CONTENT_MANIFEST.json");
            for (i = 0; i < manifest.sections.length; i += 1) { if (manifest.sections[i].id === "strata") { section = manifest.sections[i]; } }
            var source = SHAN.historySource.verifySource(root, audit);
            SHAN.historySkin.apply(doc, tokens, base, context);
            SHAN.history.create(doc, root, source, map, audit, tokens, section, context);
        } else { throw new Error("Unsupported component kind " + c.kind); }
        return {doc: doc, first: 0, count: doc.pages.length, warnings: context.warnings};
    },
    audit: function (result, start) {
        var doc = result.doc, i, j, page, frames, story, seen = {}, visible = 0, links, fonts, font;
        doc.recompose();
        this.check(result.count > 0, "No document pages");
        for (i = result.first; i < result.first + result.count; i += 1) {
            page = doc.pages.item(i);
            this.check(this.side(page) === ((start + i - result.first) % 2 ? "RIGHT_HAND" : "LEFT_HAND"), "Component page side mismatch " + page.name);
            this.check(page.pageItems.length > 0, "Unexpected empty component page " + page.name);
            frames = page.textFrames;
            for (j = 0; j < frames.length; j += 1) {
                story = frames.item(j).parentStory;
                if (!seen[story.id]) {
                    seen[story.id] = true; this.check(!story.overflows, "Overset story " + story.id + " frame " + frames.item(j).label);
                    visible += String(story.contents).length;
                }
            }
        }
        this.check(visible > 0, "No component text on actual document pages");
        links = doc.links;
        for (i = 0; i < links.length; i += 1) { this.check(links.item(i).status === LinkStatus.NORMAL, "Invalid link " + links.item(i).name); }
        fonts = doc.fonts;
        for (i = 0; i < fonts.length; i += 1) { font = fonts[i]; this.check(font.status === FontStatus.INSTALLED, "Missing font " + font.name); }
        return {overset: false, visible_characters: visible, links: links.length};
    },
    exportPDF: function (doc, file, first, count) {
        var pref = app.pdfExportPreferences, old = pref.properties;
        try {
            pref.pageRange = first === undefined ? PageRange.ALL_PAGES : "+" + (first + 1) + (count > 1 ? "-+" + (first + count) : "");
            pref.exportReaderSpreads = false; pref.useDocumentBleedWithPDF = true;
            pref.cropMarks = false; pref.bleedMarks = false; pref.registrationMarks = false;
            pref.colorBars = false; pref.pageInformationMarks = false; pref.viewPDF = false;
            doc.exportFile(ExportFormat.PDF_TYPE, file, false);
        } finally { pref.properties = old; }
        this.check(file.exists && file.length > 0, "PDF export missing " + file.fsName);
    },
    page: function (doc, label) {
        var page = doc.pages.item(0);
        if (page.label) { page = doc.pages.add(LocationOptions.AT_END); }
        page.appliedMaster = NothingEnum.NOTHING; page.label = label;
        return page;
    },
    place: function (page, file, number, label) {
        var oldPage = app.pdfPlacePreferences.pageNumber, oldCrop = app.pdfPlacePreferences.pdfCrop, rect, graphic, placed, bounds;
        try {
            app.pdfPlacePreferences.pageNumber = number; app.pdfPlacePreferences.pdfCrop = PDFCrop.CROP_TRIM;
            rect = page.rectangles.add(); rect.label = label; bounds = page.bounds;
            rect.geometricBounds = bounds; rect.strokeWeight = 0;
            rect.fillColor = page.parent.parent.swatches.itemByName("None");
            placed = rect.place(file); graphic = placed[0];
            this.check(graphic && graphic.isValid, "Placed PDF object missing " + label);
            this.check(graphic.pdfAttributes.pageNumber === number, "PDF source page mismatch " + label);
            graphic.horizontalScale = 100; graphic.verticalScale = 100;
            rect.fit(FitOptions.CENTER_CONTENT);
            var gb = graphic.geometricBounds, tolerance = SHAN.utils.pt(0.2);
            this.check(Math.abs(gb[3] - gb[1] - (bounds[3] - bounds[1])) < tolerance && Math.abs(gb[2] - gb[0] - (bounds[2] - bounds[0])) < tolerance, "PDF TrimBox mismatch " + label);
            this.check(graphic.itemLink && graphic.itemLink.status === LinkStatus.NORMAL, "Placed PDF link invalid " + label);
        } finally { app.pdfPlacePreferences.pageNumber = oldPage; app.pdfPlacePreferences.pdfCrop = oldCrop; }
    },
    focus: function (doc) {
        this.check(doc && doc.isValid && doc.pages.length > 0, "Review document unavailable for focus");
        var windows = doc.layoutWindows; this.check(windows.length > 0, "Review layout window missing");
        var window = windows.item(0);
        this.check(typeof window.bringToFront === "function", "Review window cannot be activated");
        window.bringToFront(); window.activePage = doc.pages.item(0);
        this.check(app.activeWindow.activePage.id === doc.pages.item(0).id, "Focus remained on Parent/other document");
        return {target_page: doc.pages.item(0).name, active_page: app.activeWindow.activePage.name, active_page_is_parent: false};
    },
    run: function (root, runtime) {
        var output = root + "/exports/assembly_v0", folder = Folder(output), componentsFolder;
        this.check(folder.exists || folder.create(), "Cannot create Assembly exports");
        componentsFolder = Folder(output + "/components"); this.check(componentsFolder.exists || componentsFolder.create(), "Cannot create component exports");
        runtime.setStage("load-manifest");
        var manifest = this.read(root, "content/ASSEMBLY_V0_MANIFEST.json"), tokens = this.read(root, "spec/ASSEMBLY_V0_TOKENS.json");
        runtime.setStage("validate-sources"); this.validateSources(root, manifest);
        runtime.setStage("editorial-correction-check");
        var profile = this.json(this.read(root, "content/ASSOCIATION_PROFILE.json"));
        this.check(profile.indexOf("SFA10422") >= 0 && profile.indexOf("SFW10422") < 0, "Approved editorial correction not applied");
        var report = {mode: tokens.mode, status: "RUNNING", components: [], pending_items: [], intentional_blanks: [], warnings: [], folio_status: "Target section numbering applied before renderer", frozen_scope_changed: false};
        runtime.report = report;
        var interior = this.fresh({document: null}, 1), review = null, next = 1, i, j, c, rendered, audit, file, page, entry;
        runtime.interior = interior;
        for (i = 0; i < manifest.interior.length; i += 1) {
            c = manifest.interior[i]; runtime.component_id = c.id;
            if (c.start_on_recto && next % 2 === 0) {
                page = this.page(interior, "SHAN_ASSEMBLY:intentional_blank_before:" + c.section_id);
                report.intentional_blanks.push({page: next, before: c.id, reason: "Recto chapter start"}); next += 1;
            }
            runtime.setStage("render-component:" + c.id);
            rendered = this.render(root, c, next, runtime); audit = this.audit(rendered, next);
            file = File(output + "/components/" + c.id + ".pdf");
            runtime.setStage("export-component:" + c.id); this.exportPDF(rendered.doc, file, rendered.first, rendered.count);
            entry = {id: c.id, kind: c.kind, status: c.kind === "placeholder" ? "PENDING_PLACEHOLDER" : "COMPLETED", start_page: next,
                end_page: next + rendered.count - 1, page_count: rendered.count, start_side: this.side(rendered.doc.pages.item(rendered.first)),
                source: c.source || "spec/CONTENT_MANIFEST.json#" + c.section_id, source_pdf: file.fsName, overset: audit.overset, visible_characters: audit.visible_characters};
            report.components.push(entry);
            if (c.kind === "placeholder") { report.pending_items.push(c.id); }
            for (j = 0; j < rendered.warnings.length; j += 1) { report.warnings.push(c.id + ": " + rendered.warnings[j]); }
            runtime.setStage("compose-interior:" + c.id);
            for (j = 0; j < rendered.count; j += 1) {
                page = this.page(interior, "SHAN_ASSEMBLY:" + c.id + ":pdf_page:" + (j + 1));
                this.place(page, file, j + 1, page.label);
            }
            next += rendered.count;
            // Only our successfully exported temporary document is closed. Failure documents remain available.
            rendered.doc.close(SaveOptions.NO); runtime.document = null;
        }
        runtime.component_id = null; report.interior_pages = interior.pages.length;
        this.check(report.interior_pages === next - 1, "Interior page count mismatch");
        runtime.setStage("save-interior"); interior.save(File(output + "/SHAN_INTERIOR_ASSEMBLY_V0.indd"));
        runtime.setStage("export-interior"); this.exportPDF(interior, File(output + "/SHAN_INTERIOR_ASSEMBLY_V0.pdf"));
        review = this.fresh({document: null}, 1); runtime.review = review; review.documentPreferences.facingPages = false;
        runtime.setStage("compose-review-cover");
        page = this.page(review, "SHAN_ASSEMBLY:approved_front_cover");
        this.place(page, File(root + "/" + manifest.cover.front.file), 1, page.label);
        runtime.setStage("compose-review-interior");
        for (i = 0; i < interior.pages.length; i += 1) {
            page = this.page(review, "SHAN_ASSEMBLY:interior_pdf_page:" + (i + 1));
            this.place(page, File(output + "/SHAN_INTERIOR_ASSEMBLY_V0.pdf"), i + 1, page.label);
        }
        report.review_pages_including_front_cover = review.pages.length;
        this.check(review.pages.length === interior.pages.length + 1, "Review count mismatch");
        report.focus = this.focus(review);
        runtime.setStage("save-review"); review.save(File(output + "/SHAN_REVIEW_V0.indd"));
        runtime.setStage("export-review"); this.exportPDF(review, File(output + "/SHAN_REVIEW_V0.pdf"));
        runtime.setStage("write-report"); report.status = "PASS";
        this.write(output + "/SHAN_ASSEMBLY_V0_REPORT.json", this.json(report));
        this.write(output + "/SHAN_ASSEMBLY_V0_REPORT.txt", "PASS Assembly V0\n" + this.json(report));
        return report;
    }
};
