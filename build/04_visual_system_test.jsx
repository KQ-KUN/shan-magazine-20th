#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../modules/interview.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../visual/chapter_skin.jsx"
#include "../visual/interview_skin.jsx"
#include "../visual/apply_visual_system.jsx"

(function () {
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        var root = File($.fileName).parent.parent.fsName;
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var doc = SHAN.visualSystem.createTestDocument(root, context);
        alert("Visual System 原型已创建；请检查字体报告与页眉页脚。未保存或导出。\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) { alert("Visual System 未完成：" + e.message + "\n行号：" + e.line); throw e; }
    finally { app.scriptPreferences.measurementUnit = unit; }
}());
