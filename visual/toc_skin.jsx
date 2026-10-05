var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.tocSkin = {
    apply:function(doc,t,base){
        var colors={C_TOC_Text:[0,0,0,100],C_TOC_Red:[20,84,65,28],C_TOC_Muted:[0,0,0,58]},key,color,style,def,font,fonts=app.fonts.everyItem().getElements();
        for(key in colors){if(!colors.hasOwnProperty(key)){continue;}color=SHAN.utils.ensureNamed(doc.colors,key);color.model=ColorModel.PROCESS;color.space=ColorSpace.CMYK;color.colorValue=colors[key];}
        color=SHAN.utils.ensureNamed(doc.colors,"C_TOC_Paper");color.model=ColorModel.PROCESS;color.space=ColorSpace.RGB;color.colorValue=base.colors.C_PAPER.rgb;
        for(key in t.styles){if(!t.styles.hasOwnProperty(key)){continue;}def=t.styles[key];font=SHAN.typography.chooseFont(fonts,base.font_stacks[def.family],def.weight);
            SHAN.toc.check(font,"Missing approved directory font "+key);style=SHAN.utils.ensureNamed(doc.paragraphStyles,key);style.basedOn=doc.paragraphStyles[0];
            style.appliedFont=font.font;style.pointSize=def.size_pt;style.leading=def.leading_pt;style.fillColor=doc.colors.itemByName(def.color);style.tracking=def.tracking || 0;style.hyphenation=false;style.firstLineIndent=0;
        }
    }
};
