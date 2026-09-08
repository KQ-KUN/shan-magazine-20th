#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"

(function () {
    var context = { warnings: [], document: null };
    var previousUnit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context);
        SHAN.parents.create(doc, context);
        doc.insertLabel("SHAN_FOUNDATION_WARNINGS", context.warnings.join("\n"));
        alert("《山》Foundation 已建立于新文档。\n" +
            "9 组 Parent Pages；未导入正文、未确定最终页数、未保存或导出。\n\n" +
            context.warnings.join("\n"));
    } catch (error) {
        alert("Foundation 未完成：" + error.message + "\n行号：" + error.line +
            "\n新文档可能包含部分结果，请勿作为完成版使用。既有文档未修改。");
        throw error;
    } finally {
        app.scriptPreferences.measurementUnit = previousUnit;
    }
}());
