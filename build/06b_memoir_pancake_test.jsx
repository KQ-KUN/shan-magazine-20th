#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/memoir.jsx"
#include "../visual/memoir_skin.jsx"

(function () {
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokenFile = File(root + "/spec/MEMOIR_TOKENS.json");
        tokenFile.encoding = "UTF-8";
        if (!tokenFile.open("r")) { throw new Error("Cannot read Memoir tokens"); }
        var t;
        try { t = SHAN.chapter.parseJSON(tokenFile.read()); } finally { tokenFile.close(); }
        var manifestFile = File(root + "/assets/PANCAKE_MEDIA_MANIFEST.json");
        manifestFile.encoding = "UTF-8";
        if (!manifestFile.open("r")) { throw new Error("Cannot read Pancake media manifest"); }
        var media;
        try { media = SHAN.chapter.parseJSON(manifestFile.read()); } finally { manifestFile.close(); }
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.memoirSkin.apply(doc, t, base, context);
        SHAN.memoir.create(doc, File(root + "/manuscripts/08_memoir_煎饼回忆录_奶牛煎饼_CLEAN.docx"),
            "memoir_pancake", File(root + "/" + media.file), media.width_mm, media.height_mm);
        alert("Memoir《煎饼回忆录》复用测试；未保存或导出。\n" + doc.extractLabel("SHAN_MEMOIR_REPORT") + "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) { alert("Memoir《煎饼回忆录》未完成：" + e.message + "\n行号：" + e.line); throw e; }
    finally { app.scriptPreferences.measurementUnit = unit; }
}());
