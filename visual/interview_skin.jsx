var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.interviewSkin = {
    apply: function (doc, t) {
        var style = doc.objectStyles.itemByName("O_Text_Main");
        if (!style.isValid) { throw new Error("Missing O_Text_Main"); }
        style.textFramePreferences.textColumnCount = t.interview_visual.body_columns;
        style.textFramePreferences.textColumnGutter = t.interview_visual.column_gutter_mm + " mm";
        // No portrait/archive/pull-quote placeholders; those are not this task.
    },
    sample: function (doc, file, questionLimit, context) {
        // Test fixture selection only: retain the introduction and complete Q/A groups.
        // Boundaries come from imported Word styles, never question text or speaker names.
        SHAN.interview.checkStyles(doc);
        doc.textPreferences.smartTextReflow = false;
        var first = SHAN.interview.addFrame(doc, doc.pages.item(0), "visual_excerpt", 1);
        var story = SHAN.interview.importWord(first, file), i, questions = 0, cut = story.paragraphs.length, expected = "";
        for (i = 0; i < story.paragraphs.length; i += 1) {
            if (story.paragraphs.item(i).appliedParagraphStyle.name === "InterviewQuestion") {
                questions += 1;
                if (questions > questionLimit) { cut = i; break; }
            }
        }
        // Validate/map the complete source before selecting the authorized test excerpt.
        SHAN.interview.mapStory(doc, story);
        for (i = 0; i < cut; i += 1) { expected += story.paragraphs.item(i).contents; }
        if (cut < story.paragraphs.length) { story.paragraphs.itemByRange(cut, story.paragraphs.length - 1).remove(); }
        if (story.contents !== expected) { throw new Error("Visual excerpt text changed"); }
        story.label = "SHAN_VISUAL:interview_excerpt";
        var pages = SHAN.interview.flow(doc, story, first, "visual_excerpt");
        doc.insertLabel("SHAN_VISUAL_EXCERPT", "Source introduction + first " + questionLimit + " complete Q/A groups; paragraphs=" + cut + "; pages=" + pages + "; overset=" + story.overflows);
        return story;
    }
};
