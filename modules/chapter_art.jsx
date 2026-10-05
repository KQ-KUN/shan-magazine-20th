var SHAN = typeof SHAN === "undefined" ? {} : SHAN;
SHAN.chapterArt = {
    check: function (value, message) { if (!value) { throw new Error("ChapterArt: " + message); } },
    styleName: function(role){return "P_Art_"+this.activeSection+"_"+role;},
    color: function (doc, name, value) {
        name="CA_"+this.activeSection+"_"+name.replace(/^CA_/,"");
        var color = doc.colors.itemByName(name);
        if (!color.isValid) { color = doc.colors.add({name: name}); }
        color.model = ColorModel.PROCESS; color.space = ColorSpace.CMYK; color.colorValue = value;
        return color;
    },
    mix: function (a,b,t) { var out=[],i; for(i=0;i<4;i+=1){out.push(a[i]*(1-t)+b[i]*t);} return out; },
    point: function (page,x,y) { var b=page.bounds; return [b[1]+SHAN.utils.pt(x),b[0]+SHAN.utils.pt(y)]; },
    path: function (doc,page,points,color,width,fill,label) {
        var item=fill?page.polygons.add():page.graphicLines.add(),out=[],i;
        item.label="SHAN_CHAPTER_ART:"+label;
        for(i=0;i<points.length;i+=1){out.push(this.point(page,points[i][0],points[i][1]));}
        item.paths[0].entirePath=out;
        item.strokeWeight=fill?0:width;item.strokeColor=fill?doc.swatches.itemByName("None"):color;
        item.fillColor=fill?color:doc.swatches.itemByName("None");
        return item;
    },
    dot: function (doc,page,x,y,size,color,label) {
        var item=page.ovals.add(),b=page.bounds,p=SHAN.utils.pt;
        item.label="SHAN_CHAPTER_ART:"+label;item.strokeWeight=0;item.fillColor=color;
        item.strokeColor=doc.swatches.itemByName("None");
        item.geometricBounds=[b[0]+p(y-size/2),b[1]+p(x-size/2),b[0]+p(y+size/2),b[1]+p(x+size/2)];return item;
    },
    styles: function (doc,t,base,light) {
        var paper=this.color(doc,"CA_Paper",[2,2,5,0]),black=this.color(doc,"CA_100K",[0,0,0,100]);
        var ink=this.color(doc,"CA_SDU_Red",[20,84,65,28]),roles={Number:[t.number_pt,t.number_pt*1.15,"sans_cn","Medium"],Title:[t.title_pt,t.title_pt*1.2,"serif_cn","SemiBold"],English:[t.english_pt,15,"sans_cn","Regular"],Intro:[t.intro_pt,t.intro_leading_pt,"serif_cn","Regular"],Keyword:[8,12,"mono","Regular"]};
        var fonts=app.fonts.everyItem().getElements(),key,def,style,chosen;
        for(key in roles){if(!roles.hasOwnProperty(key)){continue;}def=roles[key];style=doc.paragraphStyles.itemByName(this.styleName(key));
            if(!style.isValid){style=doc.paragraphStyles.add({name:this.styleName(key)});}
            chosen=SHAN.typography.chooseFont(fonts,base.font_stacks[def[2]],def[3]);this.check(chosen && chosen.exact,"Missing approved font "+key);
            style.appliedFont=chosen.font;style.pointSize=def[0];style.leading=def[1];style.fillColor=light?(key==="Title"?ink:black):paper;
            style.hyphenation=false;style.spaceBefore=0;style.spaceAfter=0;style.tracking=key==="English"?110:0;
        }
    },
    text: function (doc,page,text,role,box) {
        var frame=page.textFrames.add(),b=page.bounds,p=SHAN.utils.pt;
        frame.label="SHAN_CHAPTER_ART:text:"+role;frame.appliedObjectStyle=doc.objectStyles.item(0);
        frame.fillColor=doc.swatches.itemByName("None");frame.strokeColor=doc.swatches.itemByName("None");
        frame.textFramePreferences.insetSpacing=[0,0,0,0];frame.textFramePreferences.textColumnCount=1;
        frame.geometricBounds=[b[0]+p(box[1]),b[1]+p(box[0]),b[0]+p(box[1]+box[3]),b[1]+p(box[0]+box[2])];
        frame.contents=text;frame.parentStory.paragraphs[0].applyParagraphStyle(doc.paragraphStyles.itemByName(this.styleName(role)),true);
        return frame;
    },
    motif: function (doc,page,id,transition,background,foreground) {
        var i,j,x,y,points=[],shade=this.color(doc,"CA_Motif",this.mix(background,foreground,.40));
        var soft=this.color(doc,"CA_Motif_Soft",this.mix(background,foreground,.17)),shift=transition?23:0;
        if(id==="origin"){
            var cx=transition?122:61,cy=transition?144:153;
            for(i=0;i<24;i+=1){var angle=(i*137.51+17)*Math.PI/180,len=22+(i%8)*7;
                x=cx+Math.cos(angle)*len;y=cy+Math.sin(angle)*len*.57;
                this.path(doc,page,[[cx+Math.cos(angle)*11,cy+Math.sin(angle)*6],[x,y]],soft,.65,false,"ember-ray");
                this.dot(doc,page,x,y,i%6===0?1.5:.65,shade,"ember-particle");}
            this.dot(doc,page,cx,cy,3.3,this.color(doc,"CA_Ember",[0,20,43,0]),"ember-core");
        } else if(id==="strata"){
            for(i=0;i<6;i+=1){points=[];for(j=0;j<=20;j+=1){x=-3+j*9.55;y=112+i*13+Math.sin(j*.47+i*.6+shift)*6+Math.sin(j*.19)*9;points.push([x,y]);}
                points.push([188,203]);points.push([-3,203]);this.path(doc,page,points,this.color(doc,"CA_Layer_"+i,this.mix(background,foreground,.045+i*.027)),0,true,"sediment-band");}
            for(i=0;i<12;i+=1){points=[];for(j=0;j<=28;j+=1){points.push([-3+j*191/28,113+i*6+Math.sin(j*.36+i*.18+shift)*5+Math.sin(j*.15)*8]);}this.path(doc,page,points,shade,.5,false,"sediment-contour");}
        } else if(id==="constellations" || id==="beyond"){
            for(i=0;i<4;i+=1){points=[];for(j=0;j<=64;j+=1){var a=(j*5.625+12*i)*Math.PI/180;
                x=(id==="beyond"?135:105)+shift+Math.cos(a)*(55+i*13)-Math.sin(a)*13;
                y=(id==="beyond"?148:145)+Math.sin(a)*(17+i*6)+Math.cos(a)*15;points.push([x,y]);}
                this.path(doc,page,points,i%2?soft:shade,.6,false,"orbit");}
            for(i=0;i<23;i+=1){x=22+(i*67%137);y=103+(i*43%91);this.dot(doc,page,x,y,i%7===0?1.6:.65,shade,"star");}
            if(id==="beyond"){for(i=0;i<4;i+=1){points=[];for(j=0;j<=24;j+=1){points.push([-3+j*191/24,180+i*6-Math.abs(Math.sin(j*.19+shift))*11]);}this.path(doc,page,points,shade,.6,false,"far-horizon");}}
            else{this.path(doc,page,[[31,153],[58,139],[75,164],[110,120],[153,145]],shade,.65,false,"constellation-route");}
        } else if(id==="ridge"){
            for(i=0;i<10;i+=1){points=[];for(j=0;j<=32;j+=1){x=-3+j*191/32;y=188-i*4-Math.exp(-Math.pow((x-83-shift)/47,2))*45+Math.sin(j*.68)*3;points.push([x,y]);}this.path(doc,page,points,i%3===0?shade:soft,.65,false,"ridge-contour");}
            this.path(doc,page,[[26,177],[62,154],[88,132],[112,150],[154,163]],shade,1,false,"ridge-route");
        } else if(id==="now"){
            for(i=0;i<10;i+=1){x=20+i*16;this.path(doc,page,[[x,106],[x,196]],soft,.5,false,"signal-grid");}
            for(i=0;i<6;i+=1){y=112+i*16;this.path(doc,page,[[15,y],[172,y]],soft,.5,false,"signal-grid");}
            this.path(doc,page,[[24,163],[64,163],[93,136],[164,136]],shade,1,false,"signal-route");
            this.path(doc,page,[[93,107],[93,193]],shade,.7,false,"time-coordinate");this.dot(doc,page,93,136,3.5,this.color(doc,"CA_Signal",[3,8,20,0]),"present-point");
        } else {
            for(i=0;i<14;i+=1){points=[];for(j=0;j<=25;j+=1){y=105+j*3.7;x=20+i*3.2+Math.sin(j*.18)*10;points.push([x,y]);}this.path(doc,page,points,shade,.65,false,"entrance-west");
                points=[];for(j=0;j<=25;j+=1){y=105+j*3.7;x=164-i*2.8-Math.sin(j*.15)*10;points.push([x,y]);}this.path(doc,page,points,soft,.65,false,"entrance-east");}
        }
    },
    render: function (doc,page,section,t,base,transition) {
        var def=t.sections[section.id],b=page.bounds,p=SHAN.utils.pt,bg,foreground,frame,i,texts=[],frames=[];
        this.check(def,"Unknown section "+section.id);this.check(page.side===(transition?PageSideOptions.LEFT_HAND:PageSideOptions.RIGHT_HAND),"Wrong page side "+section.id);
        this.activeSection=section.id;
        page.appliedMaster=NothingEnum.NOTHING;page.label=transition?"CHAPTER_TRANSITION_VERSO:"+section.id:"CHAPTER_OPENER:"+section.id;
        this.styles(doc,t,base,def.light_background);
        bg=this.color(doc,"CA_Background",def.cmyk);foreground=def.light_background?[20,84,65,28]:[2,2,5,0];
        var rect=page.rectangles.add();rect.label="SHAN_CHAPTER_ART:full_bleed";rect.fillColor=bg;rect.strokeWeight=0;
        rect.geometricBounds=[b[0]-p(t.bleed_mm),b[1]-p(t.bleed_mm),b[2]+p(t.bleed_mm),b[3]+p(t.bleed_mm)];
        this.motif(doc,page,section.id,transition,def.cmyk,foreground);
        if(transition){frames.push(this.text(doc,page,section.en,"Keyword",[15,229,140,10]));}
        else{
            if(section.display_index!==null){doc.paragraphStyles.itemByName(this.styleName("Number")).fillColor=this.color(doc,"CA_Number",this.mix(def.cmyk,foreground,.27));frames.push(this.text(doc,page,section.display_index,"Number",[119,21,51,54]));}
            frames.push(this.text(doc,page,section.cn,"Title",[18,31,96,36]));frames.push(this.text(doc,page,section.en,"English",[19,76,144,14]));
            frames.push(this.text(doc,page,section.intro,"Intro",[18,215,145,28]));
        }
        doc.recompose();
        this.check(page.textFrames.length===frames.length,"Unexpected chapter text frame");
        for(i=0;i<frames.length;i+=1){frame=frames[i];this.check(!frame.overflows,"Overset "+section.id+" "+frame.label);texts.push(String(frame.contents));
            var f=frame.geometricBounds;this.check(f[1]>=b[1]+p(transition?5:t.inside_mm)-.1 && f[3]<=b[3]-p(5)+.1,"Unsafe text x "+frame.label);
            this.check(f[0]>=b[0]+p(5)-.1 && f[2]<=b[2]-p(5)+.1,"Unsafe text y "+frame.label);
        }
        var expected=transition?[section.en]:(section.display_index===null?[section.cn,section.en,section.intro]:[section.display_index,section.cn,section.en,section.intro]);
        this.check(texts.join("\r")===expected.join("\r"),"Chapter copy changed "+section.id);
        for(i=0;i<doc.colors.length;i+=1){var color=doc.colors[i];if(color.name.indexOf("CA_")!==0){continue;}
            this.check(color.model===ColorModel.PROCESS && color.space===ColorSpace.CMYK,"Non-process-CMYK swatch "+color.name);
            var values=color.colorValue,tac=0,j;for(j=0;j<values.length;j+=1){tac+=values[j];}
            this.check(tac<=t.max_artwork_tac_percent+.1,"Artwork ink limit "+color.name);
        }
        return {section:section.id,type:transition?"CHAPTER_TRANSITION_VERSO":"CHAPTER_OPENER",side:SHAN.assemblyV0.side(page),page:page.name,bleed_mm:t.bleed_mm,exact_copy:true,overset:false,cmyk_process:true,swatch:def.cmyk};
    }
};
