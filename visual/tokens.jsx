var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.visualTokens = {
    read: function (file) {
        if (!file.exists) { throw new Error("Visual tokens missing: " + file.fsName); }
        file.encoding = "UTF-8";
        if (!file.open("r")) { throw new Error("Cannot read visual tokens"); }
        var text;
        try { text = file.read(); } finally { file.close(); }
        // Reuse the frozen, native-tested data parser; do not execute JSON.
        var tokens = SHAN.chapter.parseJSON(text);
        this.validate(tokens);
        return tokens;
    },
    validate: function (t) {
        var key, i, style;
        function positive(n, name) { if (typeof n !== "number" || !isFinite(n) || n <= 0) { throw new Error("Invalid visual token: " + name); } }
        if (!t || t.status !== "APPROVED_FOR_PROTOTYPE" || !t.colors || !t.font_stacks || !t.paragraph_styles || !t.running_system || !t.chapter_visual || !t.interview_visual) { throw new Error("Incomplete visual tokens"); }
        for (key in t.colors) {
            if (!t.colors.hasOwnProperty(key)) { continue; }
            if (!(t.colors[key].rgb instanceof Array) || t.colors[key].rgb.length !== 3) { throw new Error("Invalid RGB: " + key); }
            for (i = 0; i < 3; i += 1) {
                if (typeof t.colors[key].rgb[i] !== "number" || t.colors[key].rgb[i] < 0 || t.colors[key].rgb[i] > 255) { throw new Error("Invalid RGB channel: " + key); }
            }
        }
        for (key in t.paragraph_styles) {
            if (!t.paragraph_styles.hasOwnProperty(key)) { continue; }
            style = t.paragraph_styles[key];
            positive(style.size_pt, key + ".size_pt"); positive(style.leading_pt, key + ".leading_pt");
            if (!(t.font_stacks[style.family] instanceof Array) || !t.font_stacks[style.family].length) { throw new Error("Missing approved font stack: " + style.family); }
            if (style.color && !t.colors[style.color]) { throw new Error("Unknown color token: " + style.color); }
        }
        if (t.interview_visual.default_portrait !== false || t.interview_visual.do_not_add_portrait_placeholder !== true) { throw new Error("Portraits are not authorized"); }
        positive(t.interview_visual.body_columns, "body_columns");
        positive(t.interview_visual.column_gutter_mm, "column_gutter_mm");
        positive(t.chapter_visual.intro_max_width_modules, "intro_max_width_modules");
    }
};
