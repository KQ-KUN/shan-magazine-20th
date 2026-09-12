#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/feature.jsx"
#include "../visual/feature_skin.jsx"

(function () {
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokenFile = File(root + "/spec/FEATURE_TOKENS.json"), t;
        tokenFile.encoding = "UTF-8"; if (!tokenFile.open("r")) { throw new Error("Cannot read Feature tokens"); }
        try { t = SHAN.chapter.parseJSON(tokenFile.read()); } finally { tokenFile.close(); }
        var manifestFile = File(root + "/assets/NOW_MEDIA_MANIFEST.json"), manifest;
        manifestFile.encoding = "UTF-8"; if (!manifestFile.open("r")) { throw new Error("Cannot read Feature media manifest"); }
        try { manifest = SHAN.chapter.parseJSON(manifestFile.read()); } finally { manifestFile.close(); }
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.featureSkin.apply(doc, t, base, context);
        SHAN.feature.create(doc, File(root + "/manuscripts/10_feature_宇宙很大，科幻更大_几华里.docx"), "feature_universe_is_big", manifest, root);
        alert("Feature 第二样本测试；未保存或导出。\n" + doc.extractLabel("SHAN_FEATURE_REPORT") + "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) { alert("Feature 第二样本未完成：" + e.message + "\n行号：" + e.line); throw e; }
    finally { app.scriptPreferences.measurementUnit = unit; }
}());
