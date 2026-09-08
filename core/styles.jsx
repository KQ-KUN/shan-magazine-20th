var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.styles = {
    swatches: ["C_PAPER", "C_TEXT", "C_MUTED", "C_SDU_RED", "C_LINE",
        "C_ARCHIVE", "C_SPECIAL_BLUE"],
    paragraphs: ["P_Body_CN", "P_Body_EN", "P_Article_Title", "P_Article_Subtitle",
        "P_Author", "P_Section_Title_CN", "P_Section_Title_EN", "P_Chapter_Number",
        "P_Chapter_Intro", "P_Interview_Q", "P_Interview_A", "P_History_Year",
        "P_History_Event", "P_Caption", "P_Quote", "P_Fiction_Chapter", "P_Memoir_Title",
        "P_Message_Name", "P_Message_Body", "P_TOC_Level1", "P_TOC_Level2",
        "P_Page_Folio", "P_Metadata"],
    characters: ["C_Emphasis", "C_Book_Title", "C_English", "C_Number",
        "C_Metadata", "C_Quote", "C_SmallCaps"],
    objects: ["O_Image", "O_Image_FullBleed", "O_Image_Archive", "O_Caption",
        "O_Text_Main", "O_Text_Side", "O_Quote_Box", "O_Archive_Item", "O_Chapter_Line"],

    create: function (doc, context) {
        var i, name, swatch, style;
        var ensure = SHAN.utils.ensureNamed;
        for (i = 0; i < this.swatches.length; i += 1) {
            name = this.swatches[i];
            swatch = ensure(doc.colors, name);
            if (name === "C_SPECIAL_BLUE") {
                swatch.model = ColorModel.PROCESS;
                swatch.space = ColorSpace.RGB;
                swatch.colorValue = [129, 199, 212];
                swatch.label = "SPEC: #81C7D4; special pages only";
            } else {
                // TODO: DESIGN VALUE — 仅占用逻辑名称，不指定或批准任何最终色值。
                // Color 对象始终带宿主默认值；这个默认值不能被当作设计值使用。
                swatch.label = "UNRESOLVED_COLOR; host defaults only; do not apply";
            }
        }
        SHAN.utils.warn(context, "六个逻辑色板尚无批准色值；保留宿主默认值且不应用。");
        for (i = 0; i < this.paragraphs.length; i += 1) {
            style = ensure(doc.paragraphStyles, this.paragraphs[i]);
            style.basedOn = doc.paragraphStyles.item(0);
        }
        // 9.5 pt 是规格允许区间 9–9.5 pt 的上限；只通过段落样式赋值。
        style = doc.paragraphStyles.itemByName("P_Body_CN");
        style.pointSize = 9.5;
        style.leading = 15;
        doc.paragraphStyles.itemByName("P_Page_Folio").justification =
            Justification.AWAY_FROM_BINDING_SIDE;
        for (i = 0; i < this.characters.length; i += 1) {
            style = ensure(doc.characterStyles, this.characters[i]);
            style.basedOn = doc.characterStyles.item(0);
        }
        for (i = 0; i < this.objects.length; i += 1) {
            style = ensure(doc.objectStyles, this.objects[i]);
            style.basedOn = doc.objectStyles.item(0);
        }
        style = doc.objectStyles.itemByName("O_Text_Main");
        style.enableTextFrameGeneralOptions = true;
        style.textFramePreferences.textColumnCount = 2;
        style.textFramePreferences.textColumnGutter = SHAN.spec.gutterMM + " mm";
        style.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        style.enableParagraphStyle = true;
        style.appliedParagraphStyle = doc.paragraphStyles.itemByName("P_Body_CN");
        // TODO: DESIGN VALUE — 未给出具体字体家族/字重，不扫描、替换或自动选字体。
        // 其他样式仅建名称，不发明字号、字距、颜色、字形或图像效果。
        SHAN.utils.warn(context, "宋体类、黑体类、Mono 未指定具体字体；仅建立样式名称，保留宿主默认字体待确认。");
        SHAN.utils.warn(context, "除 P_Body_CN 与页码对齐外，其余未定义排版参数待人工确认；不是完成的全刊视觉样式。");
    }
};
