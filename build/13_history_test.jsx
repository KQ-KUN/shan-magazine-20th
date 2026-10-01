#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/history_source.jsx"
#include "../modules/history.jsx"
#include "../visual/history_skin.jsx"

(function () {
    var stage = "initialise", root = "", unit = null, preferences = null, doc = null;
    var runtime = { stage: stage, image_index: null, source_paragraph: null, anchor: null, frame_label: null, operation: null };
    var context = { warnings: [], document: null, runtime: runtime };
    function setStage(name, detail) {
        stage = name; runtime.stage = name;
        runtime.image_index = null; runtime.source_paragraph = null; runtime.anchor = null;
        runtime.frame_label = null; runtime.operation = null;
        var key;
        if (detail) { for (key in detail) { if (detail.hasOwnProperty(key)) { runtime[key] = detail[key]; } } }
    }
    runtime.setStage = setStage;
    function readJSON(path) { return SHAN.chapter.parseJSON(SHAN.historySource.read(File(path))); }
    function focusDocumentPage() {
        var document = doc || context.document;
        if (!document || document.isValid === false) { return; }
        var windows = app.layoutWindows, pages = document.pages;
        if (!windows || windows.length < 1 || !pages) { return; }
        var page = SHAN.historySource.at(pages, 0), window = app.activeWindow;
        if (page && page.isValid !== false && window) { window.activePage = page; }
    }
    function errorField(error, field) {
        try { return error && error[field] !== undefined ? String(error[field]) : "<unavailable>"; }
        catch (readError) { return "<unreadable>"; }
    }
    function formatError(error, stack) {
        var fields = ["stage=" + stage, "name=" + errorField(error, "name"), "message=" + errorField(error, "message"),
            "fileName=" + errorField(error, "fileName"), "line=" + errorField(error, "line")];
        var source = errorField(error, "source");
        if (source !== "<unavailable>" && source !== "<unreadable>") { fields.push("source=" + source); }
        fields.push("$.stack=" + stack);
        var keys = ["image_index", "source_paragraph", "anchor", "frame_label", "operation"], i;
        for (i = 0; i < keys.length; i += 1) {
            if (runtime[keys[i]] !== null && runtime[keys[i]] !== undefined) { fields.push(keys[i] + "=" + runtime[keys[i]]); }
        }
        return fields.join("\n");
    }
    function writeReport(name, text) {
        SHAN.historySource.require(root.length > 0, "Cannot resolve report root");
        var folder = Folder(root + "/exports/history");
        if (!folder.exists) { SHAN.historySource.require(folder.create(), "Cannot create History report folder"); }
        var file = File(folder.fsName + "/" + name); file.encoding = "UTF-8";
        SHAN.historySource.require(file.open("w"), "Cannot write " + name);
        try { SHAN.historySource.require(file.write(text) !== false, "Report write failed: " + name); }
        finally { file.close(); }
        return file.fsName;
    }
    try {
        preferences = app.scriptPreferences;
        SHAN.historySource.require(preferences, "Missing app.scriptPreferences");
        unit = preferences.measurementUnit; preferences.measurementUnit = MeasurementUnits.POINTS;
        setStage("read-json");
        var script = File($.fileName), buildFolder = script.parent;
        SHAN.historySource.require(buildFolder && buildFolder.parent, "Cannot resolve build root");
        root = buildFolder.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokens = readJSON(root + "/spec/HISTORY_TOKENS.json");
        var map = readJSON(root + "/content/HISTORY_IMPORT_MAP.json");
        var audit = readJSON(root + "/spec/HISTORY_SOURCE_AUDIT.json");
        var manifest = readJSON(root + "/spec/CONTENT_MANIFEST.json"), section = null, i;
        for (i = 0; i < manifest.sections.length; i += 1) { if (manifest.sections[i].id === "strata") { section = manifest.sections[i]; } }
        SHAN.historySource.require(section && section.chapter_index === 2 && section.display_index === "贰", "Chapter numbering mismatch");
        setStage("verify-source");
        var source = SHAN.historySource.verifySource(root, audit);
        setStage("create-document");
        doc = SHAN.document.create(context);
        setStage("create-foundation-styles");
        SHAN.styles.create(doc, context);
        setStage("create-parents");
        SHAN.parents.create(doc, context);
        setStage("apply-typography");
        SHAN.typography.apply(doc, base, context);
        setStage("apply-running-system");
        SHAN.runningSystem.apply(doc, base);
        setStage("apply-history-skin");
        SHAN.historySkin.apply(doc, tokens, base, context);
        var result = SHAN.history.create(doc, root, source, map, audit, tokens, section, context);
        setStage("focus-document-page");
        focusDocumentPage();
        setStage("write-report");
        var reportPath = writeReport("HISTORY_RUNTIME_REPORT.txt", result.report + "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
        alert(result.report + "\n\n未保存或导出；请人工检查并导出PDF。\n报告：" + reportPath);
    } catch (e) {
        // Capture the original stage/file/line BEFORE any diagnostic DOM or file I/O.
        var stack = "<unavailable>";
        try { stack = String($.stack); } catch (stackError) { /* original error takes precedence */ }
        var diagnostic = formatError(e, stack), errorPath = "";
        try {
            var failedDoc = doc || context.document;
            if (failedDoc && failedDoc.isValid !== false) { failedDoc.insertLabel("SHAN_HISTORY_REPORT", "FAIL\n" + diagnostic); }
        } catch (labelError) { diagnostic += "\nDiagnostic label failure=" + errorField(labelError, "message"); }
        try { errorPath = writeReport("HISTORY_RUNTIME_ERROR.txt", diagnostic); }
        catch (logError) { diagnostic += "\nError log write failure=" + errorField(logError, "message"); }
        try { $.writeln(diagnostic); } catch (consoleError) { /* Alert still carries the original location. */ }
        alert("History 未通过\nstage=" + stage + "\n" + errorField(e, "message") +
            "\n原始行号=" + errorField(e, "line") + "\n原始文件=" + errorField(e, "fileName") +
            (runtime.image_index !== null ? "\nimage_index=" + runtime.image_index + " / source_paragraph=" + runtime.source_paragraph + " / anchor=" + runtime.anchor : "") +
            (errorPath ? "\n诊断：" + errorPath : "\n" + diagnostic));
        // Do not rethrow: InDesign would replace the original location with this catch line.
    } finally {
        // Cleanup cannot mask the original diagnostic or close the partially rendered document.
        try { focusDocumentPage(); } catch (focusError) { try { $.writeln("History cleanup focus: " + errorField(focusError, "message")); } catch (ignoreFocus) {} }
        try { if (preferences && unit !== null) { preferences.measurementUnit = unit; } }
        catch (unitError) { try { $.writeln("History cleanup units: " + errorField(unitError, "message")); } catch (ignoreUnit) {} }
    }
}());
