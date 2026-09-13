#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/front_note.jsx"
#include "../visual/front_note_skin.jsx"

(function () {
    var context = { warnings: [], document: null }, unit = app.scriptPreferences.measurementUnit;
    try {
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var root = File($.fileName).parent.parent.fsName;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokenFile = File(root + "/spec/FRONT_NOTE_TOKENS.json"), tokens;
        tokenFile.encoding = "UTF-8"; if (!tokenFile.open("r")) { throw new Error("Cannot read Front Note tokens"); }
        try { tokens = SHAN.chapter.parseJSON(tokenFile.read()); } finally { tokenFile.close(); }
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.frontNoteSkin.apply(doc, tokens, base, context);
        SHAN.frontNote.create(doc, File(root + "/manuscripts/11_front_写在山前_FINAL.docx"),
            "front_note_shan", tokens, { hasSignature: false });
        alert("Front Note 测试；未保存或导出。\n" + doc.extractLabel("SHAN_FRONT_NOTE_REPORT") +
            "\n\n" + doc.extractLabel("SHAN_VISUAL_FONTS") + "\n\n" + context.warnings.join("\n"));
    } catch (e) { alert("Front Note 未完成：" + e.message + "\n行号：" + e.line); throw e; }
    finally { app.scriptPreferences.measurementUnit = unit; }
}());
