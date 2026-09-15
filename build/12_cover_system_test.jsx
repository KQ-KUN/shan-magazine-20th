#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../modules/cover_system.jsx"
#include "../visual/cover_system_skin.jsx"

(function () {
    function readJSON(file, label) {
        var value;
        file.encoding = "UTF-8";
        if (!file.open("r")) { throw new Error("Cannot read " + label); }
        try { value = SHAN.chapter.parseJSON(file.read()); } finally { file.close(); }
        return value;
    }
    function focusDocumentPage(document, page) {
        if (app.layoutWindows.length > 0) { app.activeWindow.activePage = page || document.pages.item(0); }
    }
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokens = readJSON(File(root + "/spec/COVER_SYSTEM_TOKENS.json"), "Cover System tokens");
        var data = readJSON(File(root + "/content/COVER_COPY.json"), "Cover System copy");
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context);
        SHAN.typography.apply(doc, base, context);
        SHAN.coverSystemSkin.apply(doc, tokens, base, context);
        var result = SHAN.coverSystem.render(doc, data, tokens, root);
        var rendered = SHAN.coverSystem.assertRendered(doc, result, data, tokens);
        focusDocumentPage(doc, result.frontPage);
        alert("Cover System Phase A 测试；未保存或导出。\n" + doc.extractLabel("SHAN_COVER_SYSTEM_REPORT") +
            "\nvisibleCharacters=" + rendered.visibleCharacters + "; logoWidthMM=" + rendered.logoWidthMM +
            "; spine=" + rendered.spineStatus + "; overset=" + rendered.overset +
            "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) {
        alert("Cover System Phase A 未完成：" + e.message + "\n行号：" + e.line);
        throw e;
    } finally {
        app.scriptPreferences.measurementUnit = unit;
    }
}());
