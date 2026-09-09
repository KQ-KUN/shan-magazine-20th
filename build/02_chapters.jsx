#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"

(function () {
    var context = { warnings: [], document: null };
    var previousUnit = app.scriptPreferences.measurementUnit;
    try {
        var manifestFile = File(File($.fileName).parent.parent.fsName + "/spec/CONTENT_MANIFEST.json");
        var manifest = SHAN.chapter.readManifest(manifestFile);
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context);
        SHAN.parents.create(doc, context);
        SHAN.chapter.create(doc, manifest, context);
        doc.insertLabel("SHAN_CHAPTER_WARNINGS", context.warnings.join("\n"));
        alert("《山》Chapter 结构测试文档已建立：7 个章节扉页，未保存或导出。\n\n" + context.warnings.join("\n"));
    } catch (error) {
        alert("Chapter 未完成：" + error.message + "\n行号：" + error.line + "\n新文档可能包含部分结果，请勿作为完成版使用。既有文档未修改。");
        throw error;
    } finally {
        app.scriptPreferences.measurementUnit = previousUnit;
    }
}());
