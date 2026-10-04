var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.xingyueSkin = {
    apply: function (doc,t,base,context) {
        var prior=doc.extractLabel("SHAN_VISUAL_FONTS");
        for(var key in t.styles){if(t.styles.hasOwnProperty(key)){SHAN.utils.ensureNamed(doc.paragraphStyles,key);}}
        SHAN.typography.apply(doc,{colors:{},font_stacks:base.font_stacks,paragraph_styles:t.styles},context);
        doc.insertLabel("SHAN_VISUAL_FONTS",prior+"\n"+doc.extractLabel("SHAN_VISUAL_FONTS"));
        var object=doc.objectStyles.itemByName("O_Text_Main");
        object.textFramePreferences.textColumnCount=2;object.textFramePreferences.textColumnGutter="6 mm";
        for(var name in t.styles) {
            if(!t.styles.hasOwnProperty(name)){continue;}
            var style=doc.paragraphStyles.itemByName(name),wide=name==="P_XingYue_Title" || name==="P_XingYue_Subtitle";
            style.spanColumnType=wide?SpanColumnTypeOptions.SPAN_COLUMNS:SpanColumnTypeOptions.SINGLE_COLUMN;
            if(wide){style.spanSplitColumnCount=2;}
            style.keepWithNext=/Title|Subtitle|Section|Subhead|Media/.test(name)?1:0;
            style.keepAllLinesTogether=/Section|Subhead|Media|Caption/.test(name);
        }
    }
};
