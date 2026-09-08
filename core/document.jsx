var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.document = {
    applyMargins: function (preferences) {
        var m = SHAN.spec.marginsMM;
        preferences.top = m.top + " mm";
        preferences.bottom = m.bottom + " mm";
        // InDesign 对页语义：left=Inside、right=Outside；不要再次左右互换。
        preferences.left = m.inside + " mm";
        preferences.right = m.outside + " mm";
        preferences.columnCount = SHAN.spec.columns;
        preferences.columnGutter = SHAN.spec.gutterMM + " mm";
    },
    create: function (context) {
        var doc = app.documents.add();
        context.document = doc;
        var s = SHAN.spec;
        var pref = doc.documentPreferences;
        pref.facingPages = true;
        pref.pageBinding = PageBindingOptions.LEFT_TO_RIGHT;
        pref.pageWidth = s.widthMM + " mm";
        pref.pageHeight = s.heightMM + " mm";
        // 单页仅为 InDesign 新文档的最小空壳，不是最终刊物页数。
        pref.pagesPerDocument = 1;
        pref.createPrimaryTextFrame = false;
        pref.documentBleedUniformSize = false;
        pref.documentBleedTopOffset = s.bleedMM + " mm";
        pref.documentBleedBottomOffset = s.bleedMM + " mm";
        pref.documentBleedInsideOrLeftOffset = s.bleedMM + " mm";
        pref.documentBleedOutsideOrRightOffset = s.bleedMM + " mm";
        pref.documentBleedUniformSize = true;
        doc.viewPreferences.horizontalMeasurementUnits = MeasurementUnits.MILLIMETERS;
        doc.viewPreferences.verticalMeasurementUnits = MeasurementUnits.MILLIMETERS;
        doc.viewPreferences.rulerOrigin = RulerOrigin.SPREAD_ORIGIN;
        doc.zeroPoint = [0, 0];
        SHAN.document.applyMargins(doc.marginPreferences);
        SHAN.document.applyMargins(doc.pages.item(0).marginPreferences);
        doc.insertLabel("SHAN_SCOPE", "Foundation only; final page count undecided");
        return doc;
    }
};
