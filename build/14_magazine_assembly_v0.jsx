#target "indesign"
#include "../core/utils.jsx"
#include "../core/document.jsx"
#include "../core/styles.jsx"
#include "../core/parents.jsx"
#include "../modules/chapter.jsx"
#include "../visual/tokens.jsx"
#include "../visual/typography.jsx"
#include "../visual/running_system.jsx"
#include "../modules/interview.jsx"
#include "../visual/interview_skin.jsx"
#include "../modules/fiction.jsx"
#include "../visual/fiction_skin.jsx"
#include "../modules/memoir.jsx"
#include "../visual/memoir_skin.jsx"
#include "../modules/feature.jsx"
#include "../visual/feature_skin.jsx"
#include "../modules/front_note.jsx"
#include "../visual/front_note_skin.jsx"
#include "../modules/association_profile.jsx"
#include "../visual/association_profile_skin.jsx"
#include "../modules/history_source.jsx"
#include "../modules/history.jsx"
#include "../visual/history_skin.jsx"
#include "../modules/assembly_v0.jsx"

(function () {
    var root = File($.fileName).parent.parent.fsName;
    var runtime = {stage: "initialise", component_id: null, document: null, review: null, report: null};
    var preferences = app.scriptPreferences, unit = preferences.measurementUnit, interaction = preferences.userInteractionLevel;
    var errorFile = File(root + "/exports/assembly_v0/SHAN_ASSEMBLY_V0_RUNTIME_ERROR.txt");
    function field(e, key) { try { return e[key] === undefined ? "<unavailable>" : String(e[key]); } catch (ignored) { return "<unreadable>"; } }
    runtime.setStage = function (name, detail) {
        runtime.stage = name;
        runtime.image_index = null; runtime.source_paragraph = null; runtime.anchor = null;
        runtime.frame_label = null; runtime.operation = null;
        var key;
        if (detail) { for (key in detail) { if (detail.hasOwnProperty(key)) { runtime[key] = detail[key]; } } }
        SHAN.assemblyV0.write(root + "/exports/assembly_v0/SHAN_ASSEMBLY_V0_PROGRESS.txt", "stage=" + name + "\ncomponent=" + runtime.component_id);
    };
    try {
        preferences.measurementUnit = MeasurementUnits.POINTS;
        preferences.userInteractionLevel = UserInteractionLevels.NEVER_INTERACT;
        if (errorFile.exists) { errorFile.remove(); }
        var report = SHAN.assemblyV0.run(root, runtime);
        return "PASS Assembly V0; interior=" + report.interior_pages + "; review=" + report.review_pages_including_front_cover;
    } catch (e) {
        var original = "stage=" + runtime.stage + "\ncomponent=" + runtime.component_id + "\nname=" + field(e, "name") +
            "\nmessage=" + field(e, "message") + "\nfile=" + field(e, "fileName") + "\nline=" + field(e, "line") + "\nsource=" + field(e, "source") + "\nstack=" + $.stack +
            "\nimage_index=" + runtime.image_index + "\nsource_paragraph=" + runtime.source_paragraph + "\nanchor=" + runtime.anchor +
            "\nframe_label=" + runtime.frame_label + "\noperation=" + runtime.operation;
        try { SHAN.assemblyV0.write(errorFile.fsName, original); } catch (logError) { $.writeln(original); }
        try {
            if (runtime.report) {
                runtime.report.status = "FAIL"; runtime.report.error = original;
                SHAN.assemblyV0.write(root + "/exports/assembly_v0/SHAN_ASSEMBLY_V0_REPORT.json", SHAN.assemblyV0.json(runtime.report));
                SHAN.assemblyV0.write(root + "/exports/assembly_v0/SHAN_ASSEMBLY_V0_REPORT.txt", original);
            }
        } catch (reportError) { $.writeln("Partial report warning=" + reportError.message); }
        return "FAIL Assembly V0\n" + original;
    } finally {
        try { if (runtime.review && runtime.review.isValid) { SHAN.assemblyV0.focus(runtime.review); } } catch (focusError) { $.writeln("Focus warning=" + focusError.message); }
        try { preferences.measurementUnit = unit; preferences.userInteractionLevel = interaction; } catch (cleanupError) { $.writeln("Preference warning=" + cleanupError.message); }
    }
}());
