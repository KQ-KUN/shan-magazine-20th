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
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit, doc = null;
    function readJSON(path) { return SHAN.chapter.parseJSON(SHAN.historySource.read(File(path))); }
    function focusDocumentPage() {
        if (doc && doc.isValid && app.layoutWindows.length > 0) { app.activeWindow.activePage = SHAN.historySource.at(doc.pages, 0); }
    }
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokens = readJSON(root + "/spec/HISTORY_TOKENS.json");
        var map = readJSON(root + "/content/HISTORY_IMPORT_MAP.json");
        var audit = readJSON(root + "/spec/HISTORY_SOURCE_AUDIT.json");
        var manifest = readJSON(root + "/spec/CONTENT_MANIFEST.json"), section = null, i;
        for (i = 0; i < manifest.sections.length; i += 1) { if (manifest.sections[i].id === "strata") { section = manifest.sections[i]; } }
        SHAN.historySource.require(section && section.chapter_index === 2 && section.display_index === "贰", "Chapter numbering mismatch");
        var source = SHAN.historySource.verifySource(root, audit);
        doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.historySkin.apply(doc, tokens, base, context);
        var result = SHAN.history.create(doc, root, source, map, audit, tokens, section, context);
        focusDocumentPage();
        var folder = Folder(root + "/exports/history"); if (!folder.exists) { folder.create(); }
        var report = File(folder.fsName + "/HISTORY_RUNTIME_REPORT.txt"); report.encoding = "UTF-8";
        SHAN.historySource.require(report.open("w"), "Cannot write runtime report");
        try { report.write(result.report + "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n")); } finally { report.close(); }
        alert(result.report + "\n\n未保存或导出；请人工检查并导出PDF。\n报告：" + report.fsName);
    } catch (e) {
        if (doc && doc.isValid) { doc.insertLabel("SHAN_HISTORY_REPORT", "FAIL: " + e.message); }
        alert("History 未通过：" + e.message + "\n行号：" + e.line); throw e;
    } finally {
        focusDocumentPage(); app.scriptPreferences.measurementUnit = unit;
    }
}());
