var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
/* Read-only History data/view diagnostics. Never edits content, styles or geometry. */
SHAN.historyRuntime = {
    at: function (items, index) {
        // Native collections need not expose isValid. Only members are DOM objects.
        if (!items || typeof items.length !== "number" || index < 0 || index >= items.length) { return null; }
        var item = items[index];
        return item !== undefined && item !== null ? item : (typeof items.item === "function" ? items.item(index) : null);
    },
    firstPage: function (document) {
        var pages = document.pages;
        if (!pages || pages.length < 1) { return null; }
        // The target ALWAYS belongs to document.pages, never to masterSpreads.
        return typeof pages.item === "function" ? document.pages.item(0) : this.at(pages, 0);
    },
    same: function (a, b) { return !!a && !!b && a.id !== undefined && b.id !== undefined && a.id === b.id; },
    name: function (object) { return object && object.name !== undefined ? String(object.name) : "<unavailable>"; },
    parentView: function (document, window, page) {
        var masters = document.masterSpreads, spread = window.activeSpread, parent = page ? page.parent : null, i, j, master, pages;
        for (i = 0; masters && i < masters.length; i += 1) {
            master = this.at(masters, i);
            if (this.same(master, spread) || this.same(master, page) || this.same(master, parent)) { return true; }
            pages = master ? master.pages : null;
            for (j = 0; pages && j < pages.length; j += 1) { if (this.same(page, this.at(pages, j))) { return true; } }
        }
        pages = document.pages;
        for (i = 0; pages && i < pages.length; i += 1) { if (this.same(page, this.at(pages, i))) { return false; } }
        return "unknown";
    },
    view: function (document, window) {
        var page = window.activePage, spread = window.activeSpread;
        var isParent = this.parentView(document, window, page);
        var display = this.name(page), masters = document.masterSpreads, parent = page ? page.parent : null, i, master;
        if (isParent === true) {
            display = this.name(spread);
            for (i = 0; masters && i < masters.length; i += 1) {
                master = this.at(masters, i);
                if (this.same(master, page) || this.same(master, parent)) { display = this.name(master); break; }
            }
        }
        return { page: page, name: display, isParent: isParent };
    },
    focusDocumentPage: function (document, phase, rendered) {
        var entry = { focusPhase: phase, documentPages: "<unavailable>", targetPage: "<unavailable>",
            activePageBefore: "<unavailable>", activePageAfter: "<unavailable>", activePageIsParent: "unknown", focusSucceeded: false, warnings: [] };
        var target, window, ownWindows, before, after, parent, self = this;
        function warning(error) { entry.warnings.push("WARNING: History focus: " + String(error.message || error)); }
        try {
            if (!document || document.isValid === false) { throw new Error("no valid build document"); }
            var pages = document.pages; entry.documentPages = pages ? pages.length : 0;
            target = this.firstPage(document);
            if (!target || target.isValid === false) { throw new Error("no actual document page to focus"); }
            entry.targetPage = this.name(target);
            if (!app.layoutWindows || app.layoutWindows.length < 1) { throw new Error("no layout window"); }
            window = app.activeWindow;
            if (window) { before = this.view(document, window); entry.activePageBefore = before.name; }
            parent = window ? window.parent : null;
            if (!this.same(parent, document)) {
                ownWindows = document.layoutWindows; window = this.at(ownWindows, 0);
                if (!window || window.isValid === false) { throw new Error("no layout window for the build document"); }
                if (typeof window.bringToFront === "function") { window.bringToFront(); }
            }
            try { window.activePage = target; } catch (pageError) { warning(pageError); }
            after = this.view(document, window);
            // If the Parent view persists, also select the target's actual document spread.
            if (!this.same(after.page, target) || after.isParent !== false) {
                try { window.activeSpread = target.parent; window.activePage = target; } catch (retryError) { warning(retryError); }
            }
            // Inspect the visible window, rather than assuming either setter succeeded.
            window = app.activeWindow;
            if (!window) { throw new Error("active layout window unavailable after focus"); }
            after = this.view(document, window);
            entry.activePageAfter = after.name; entry.activePageIsParent = after.isParent;
            entry.focusSucceeded = this.same(window.parent, document) && this.same(after.page, target) && after.isParent === false;
        } catch (error) {
            warning(error);
            // An exception must not suppress the after-state when it can still be read.
            try {
                window = app.activeWindow;
                if (window && document) {
                    after = self.view(document, window); entry.activePageAfter = after.name; entry.activePageIsParent = after.isParent;
                }
            } catch (ignoreAfter) { /* The warning above remains in the report. */ }
        }
        if (!entry.focusSucceeded && rendered) {
            entry.warnings.push(entry.activePageIsParent === true ?
                "WARNING: History rendered, but InDesign view remained on Parent spread." :
                "WARNING: History rendered, but InDesign view did not focus the target document page.");
        }
        return entry;
    },
    snapshot: function (document, result, source, map) {
        var data = { documentPages: 0, firstPage: "<unavailable>", firstPageHistoryTextFrames: 0,
            historyStoryExists: false, historyCharacters: 0, historyParagraphs: 0, historyTextEquality: "<not checked>",
            historyYears: 0, historyImages: 0, historyOverset: "unknown", historyFontsInstalled: "unknown", historyLinksNormal: "unknown", errors: [] };
        var i, j, page, frames, frame, story = null, paragraphs, paragraph, graphics, graphic, link, fonts, font, outputIndex, sourceIndex, anchors;
        try {
            // Diagnostic order: document pages -> page-local frames -> main story -> years -> images -> overset -> fonts/links.
            if (!document || document.isValid === false) { return data; }
            var pages = document.pages; data.documentPages = pages ? pages.length : 0;
            if (data.documentPages < 1) { return data; }
            page = this.firstPage(document); data.firstPage = this.name(page); frames = page.textFrames;
            for (i = 0; frames && i < frames.length; i += 1) {
                frame = this.at(frames, i);
                if (frame && frame.label === "SHAN_HISTORY:body" && this.same(frame.parentPage, page)) {
                    data.firstPageHistoryTextFrames += 1; if (!story) { story = frame.parentStory; }
                }
            }
            if (result && result.story) { story = result.story; }
            data.historyStoryExists = !!story && story.isValid !== false && story.label === "SHAN_HISTORY:main";
            if (!data.historyStoryExists) { return data; }
            data.historyCharacters = String(story.contents).length; paragraphs = story.paragraphs;
            data.historyParagraphs = paragraphs ? paragraphs.length : 0;
            if (source && map && map.paragraph_order && map.years) {
                data.historyTextEquality = data.historyParagraphs === map.paragraph_order.length ? "PASS" : "FAIL";
                // Read module-local paragraphs with the diagnostic collection accessor.
                // Avoid delegating a read-only probe to a potentially failing DOM adapter.
                for (i = 0; i < map.paragraph_order.length; i += 1) {
                    sourceIndex = map.paragraph_order[i]; anchors = 0; paragraph = this.at(paragraphs, i);
                    for (j = 0; map.images && j < map.images.length; j += 1) { if (map.images[j].source_paragraph === sourceIndex) { anchors += 1; } }
                    try {
                        var displayed = paragraph ? SHAN.historySource.paragraphText(paragraph.contents, anchors) : null;
                        var restored = displayed;
                        if (paragraph && map.history_display) { restored = SHAN.historySource.restoreDisplayText(displayed, sourceIndex, map.history_display); }
                        if (!paragraph || restored !== source.paragraphs[sourceIndex - 1]) {
                            data.historyTextEquality = "FAIL"; data.errors.push("Text mismatch at source paragraph " + sourceIndex);
                        }
                    } catch (textError) {
                        data.historyTextEquality = "FAIL"; data.errors.push("Source paragraph " + sourceIndex + ": " + String(textError.message || textError));
                    }
                }
                for (i = 0; i < map.years.length; i += 1) {
                    outputIndex = -1;
                    for (j = 0; j < map.paragraph_order.length; j += 1) { if (map.paragraph_order[j] === map.years[i]) { outputIndex = j; break; } }
                    paragraph = this.at(paragraphs, outputIndex);
                    if (paragraph && SHAN.historySource.paragraphText(paragraph.contents, 0) === source.paragraphs[map.years[i] - 1]) { data.historyYears += 1; }
                }
            }
            graphics = story.allGraphics; data.historyImages = graphics ? graphics.length : 0;
            data.historyOverset = story.overflows;
            fonts = document.fonts; data.historyFontsInstalled = !!fonts;
            for (i = 0; fonts && i < fonts.length; i += 1) {
                font = this.at(fonts, i);
                if (!font || font.status !== FontStatus.INSTALLED) { data.historyFontsInstalled = false; }
            }
            data.historyLinksNormal = !!graphics;
            for (i = 0; graphics && i < graphics.length; i += 1) {
                graphic = this.at(graphics, i); link = graphic ? graphic.itemLink : null;
                if (!link || link.isValid === false || link.status !== LinkStatus.NORMAL) { data.historyLinksNormal = false; }
            }
        } catch (error) { data.errors.push("History data diagnostic: " + String(error.message || error)); }
        return data;
    },
    format: function (data, entries) {
        var lines = ["History document data (independent of current view)"], key, i, entry;
        for (key in data) { if (data.hasOwnProperty(key) && key !== "errors") { lines.push(key + "=" + data[key]); } }
        for (i = 0; i < data.errors.length; i += 1) { lines.push("WARNING: " + data.errors[i]); }
        if (entries.length) {
            entry = entries[entries.length - 1];
            lines.push("targetPage=" + entry.targetPage, "activePageBefore=" + entries[0].activePageBefore,
                "activePageAfter=" + entry.activePageAfter, "activePageIsParent=" + entry.activePageIsParent,
                "focusSucceeded=" + entry.focusSucceeded);
        }
        for (i = 0; i < entries.length; i += 1) {
            entry = entries[i]; lines.push("[focus:" + entry.focusPhase + "]");
            for (key in entry) { if (entry.hasOwnProperty(key) && key !== "warnings") { lines.push(key + "=" + entry[key]); } }
            lines = lines.concat(entry.warnings);
        }
        return lines.join("\n");
    }
};
