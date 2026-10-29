#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/association_profile.jsx"
#include "../visual/association_profile_skin.jsx"

(function () {
    var root = File($.fileName).parent.parent.fsName;
    var out = Folder(root + "/exports/profile_fact_correction"); out.create();
    var unit = app.scriptPreferences.measurementUnit;
    var interaction = app.scriptPreferences.userInteractionLevel;
    var range = app.pdfExportPreferences.pageRange;
    var spreads = app.pdfExportPreferences.exportReaderSpreads;
    var stage = "source", context = { warnings: [], document: null };
    function readJSON(path) {
        var file = File(root + "/" + path); file.encoding = "UTF-8";
        if (!file.open("r")) { throw new Error("Cannot read " + path); }
        try { return SHAN.chapter.parseJSON(file.read()); } finally { file.close(); }
    }
    function write(name, text) {
        var file = File(out.fsName + "/" + name); file.encoding = "UTF-8";
        if (!file.open("w")) { throw new Error("Cannot write " + name); }
        try { file.write(text); } finally { file.close(); }
    }
    try {
        app.scriptPreferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        app.scriptPreferences.measurementUnit = MeasurementUnits.POINTS;
        var base = SHAN.visualTokens.read(File(root + "/spec/VISUAL_TOKENS.json"));
        var tokens = readJSON("spec/ASSOCIATION_PROFILE_TOKENS.json");
        var data = readJSON("content/ASSOCIATION_PROFILE.json");
        var correction = readJSON("workflow/HISTORY_PROFILE_FACT_CORRECTION.json");
        if (correction.type !== "USER_APPROVED_FACT_CORRECTION") { throw new Error("Missing scoped authorization"); }
        stage = "native render";
        var doc = SHAN.document.create(context);
        SHAN.styles.create(doc, context); SHAN.parents.create(doc, context);
        SHAN.typography.apply(doc, base, context); SHAN.runningSystem.apply(doc, base);
        SHAN.associationProfileSkin.apply(doc, tokens, base, context);
        var result = SHAN.associationProfile.render(doc, data, tokens, root);
        var checked = SHAN.associationProfile.assertRendered(doc, result, data, tokens);
        var actual = [], i;
        for (i = 0; i < result.copyFrames.length; i += 1) { actual.push(String(result.copyFrames[i].contents)); }
        var visible = actual.join("\n");
        if (visible.indexOf("2006年5月") < 0 || visible.indexOf("2006年10月14日") >= 0) { throw new Error("Date assertion failed"); }
        if (tokens.ending.year_text !== "2006—2026") { throw new Error("Anniversary changed"); }
        stage = "save and export";
        doc.save(File(out.fsName + "/ASSOCIATION_PROFILE_CORRECTED.indd"));
        app.pdfExportPreferences.pageRange = PageRange.ALL_PAGES;
        app.pdfExportPreferences.exportReaderSpreads = false;
        doc.exportFile(ExportFormat.PDF_TYPE, File(out.fsName + "/ASSOCIATION_PROFILE_CORRECTED.pdf"), false);
        if (app.layoutWindows.length > 0) { app.activeWindow.activePage = result.page; }
        write("PROFILE_VISIBLE_TEXT.txt", visible);
        write("PROFILE_NATIVE_REPORT.txt", "PASS profile fact correction\n" + doc.extractLabel("SHAN_ASSOCIATION_PROFILE_REPORT") +
            "\npages=" + checked.pages + "; visibleCharacters=" + checked.visibleCharacters + "; overset=" + checked.overset +
            "\nsourceSHA256=" + correction.corrected_source_sha256 + "\n" + new Date().toUTCString() + "\n" + context.warnings.join("\n"));
        return "PASS profile fact correction; pages=" + checked.pages + "; overset=" + checked.overset;
    } catch (e) {
        var failure = "FAIL profile;stage=" + stage + ";name=" + e.name + ";message=" + e.message + ";file=" + e.fileName + ";line=" + e.line + ";stack=" + $.stack;
        write("PROFILE_NATIVE_REPORT.txt", failure); return failure;
    } finally {
        app.pdfExportPreferences.pageRange = range; app.pdfExportPreferences.exportReaderSpreads = spreads;
        app.scriptPreferences.measurementUnit = unit; app.scriptPreferences.userInteractionLevel = interaction;
    }
}());
