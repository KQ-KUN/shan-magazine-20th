#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/fiction.jsx"
#include "../visual/fiction_skin.jsx"

(function () {
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var file = File(root + "/spec/FICTION_TOKENS.json");
        file.encoding = "UTF-8";
        if (!file.open("r")) { throw new Error("Cannot read Fiction tokens"); }
        var t;
        try { t = SHAN.chapter.parseJSON(file.read()); } finally { file.close(); }
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.fictionSkin.apply(doc, t, base, context);
        SHAN.fiction.create(doc, File(root + "/manuscripts/06_fiction_传送科技逸史_田李昊.docx"), "fiction_teleport_history");
        alert("Fiction《传送科技逸史》复用测试；未保存或导出。\n" + doc.extractLabel("SHAN_FICTION_REPORT") + "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) { alert("Fiction《传送科技逸史》未完成：" + e.message + "\n行号：" + e.line); throw e; }
    finally { app.scriptPreferences.measurementUnit = unit; }
}());
