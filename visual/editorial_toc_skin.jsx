var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.editorialTocSkin = {
    apply:function(doc,t,base){
        SHAN.tocSkin.apply(doc,{styles:t.styles},base);
        var key,style,def;
        for(key in t.styles){if(!t.styles.hasOwnProperty(key)){continue;}def=t.styles[key];style=doc.paragraphStyles.itemByName(key);
            style.spaceBefore=SHAN.utils.pt(def.space_before_mm || 0);style.spaceAfter=SHAN.utils.pt(def.space_after_mm || 0);
            style.keepWithNext=0;style.keepAllLinesTogether=false;
        }
    }
};
