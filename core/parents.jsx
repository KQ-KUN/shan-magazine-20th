var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.parents = {
    definitions: [
        ["A", "TEXT", true], ["B", "INTERVIEW", true], ["C", "HISTORY", true],
        ["D", "FICTION", true], ["E", "MEMOIR", true], ["F", "GALLERY", true],
        ["G", "MESSAGE", true], ["H", "CHAPTER", false], ["I", "FRONT", true]
    ],
    addFolio: function (doc, page) {
        var isLeft = page.side === PageSideOptions.LEFT_HAND;
        var frame = page.textFrames.add();
        frame.label = "SHAN_AUTO_FOLIO";
        frame.geometricBounds = SHAN.utils.folioBounds(page.bounds, isLeft);
        // 不继承用户上一次绘图所用的描边、填色或多栏设定。
        frame.appliedObjectStyle = doc.objectStyles.item(0);
        frame.fillColor = doc.swatches.item(0); // 内置 [None]，与界面语言无关。
        frame.strokeColor = doc.swatches.item(0);
        frame.textFramePreferences.textColumnCount = 1;
        frame.textFramePreferences.insetSpacing = [0, 0, 0, 0];
        frame.contents = SpecialCharacters.AUTO_PAGE_NUMBER;
        frame.parentStory.paragraphs.item(0).appliedParagraphStyle =
            doc.paragraphStyles.itemByName("P_Page_Folio");
        // TODO: DESIGN VALUE — 页码精确基线、字号和字体尚未定义。
        // 当前容器占外侧一个模块列、下边距区域，文字统一由 P_Page_Folio 控制。
    },
    create: function (doc, context) {
        var i, j, k, definition, parent, firstParent;
        // 新文档内置母版可能来自用户预设；另建确定的双页母版后再移除它。
        var original = [];
        for (i = 0; i < doc.masterSpreads.length; i += 1) {
            original.push(doc.masterSpreads.item(i));
        }
        for (i = 0; i < this.definitions.length; i += 1) {
            definition = this.definitions[i];
            // UI 称 Parent Pages；ExtendScript DOM 仍使用 masterSpreads。
            parent = doc.masterSpreads.add(2);
            if (i === 0) {
                // 先保留新双页母版，再移除默认 A-Parent，避免设置 A 前缀时重名。
                doc.pages.item(0).appliedMaster = parent;
                for (k = original.length - 1; k >= 0; k -= 1) { original[k].remove(); }
            }
            parent.namePrefix = definition[0];
            parent.baseName = definition[1];
            if (i === 0) { firstParent = parent; }
            for (j = 0; j < parent.pages.length; j += 1) {
                SHAN.document.applyMargins(parent.pages.item(j).marginPreferences);
                if (definition[2]) { this.addFolio(doc, parent.pages.item(j)); }
            }
        }
        doc.pages.item(0).appliedMaster = firstParent;
        SHAN.utils.warn(context, "页码位于外侧下边距容器；精确基线和字体参数待确认。H-CHAPTER 不含页码。");
    }
};
