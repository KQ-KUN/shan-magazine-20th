#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/interview.jsx"

(function () {
    var context = { warnings: [], document: null };
    var previousUnit = app.scriptPreferences.measurementUnit;
    try {
        var source = File(File($.fileName).parent.parent.fsName + "/manuscripts/01_interview_邵珠瑜_贾锦阳.docx");
        if (!source.exists) { throw new Error("Interview DOCX not found: " + source.fsName); }
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context);
        SHAN.parents.create(doc, context);
        SHAN.interview.create(doc, source, "interview_shao", context);
        alert("《山》Interview 结构测试完成，未保存或导出。\n\n" + context.warnings.join("\n"));
    } catch (error) {
        alert("Interview 未完成：" + error.message + "\n行号：" + error.line + "\n新文档可能包含部分结果，请勿作为完成版使用。既有文档未修改。");
        throw error;
    } finally { app.scriptPreferences.measurementUnit = previousUnit; }
}());
