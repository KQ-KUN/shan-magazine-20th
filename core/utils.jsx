/* ExtendScript / ES3；不读取稿件，不操作当前已打开文档。 */
var SHAN = typeof SHAN === "undefined" ? {} : SHAN;

SHAN.spec = {
    widthMM: 185,
    heightMM: 260,
    bleedMM: 3,
    marginsMM: { top: 17, bottom: 20, inside: 18, outside: 15 },
    columns: 6,
    gutterMM: 6
};

SHAN.utils = {
    pt: function (mm) { return mm * 72 / 25.4; },
    warn: function (context, message) { context.warnings.push(message); },
    ensureNamed: function (collection, name) {
        var item = collection.itemByName(name);
        return item.isValid ? item : collection.add({ name: name });
    },
    moduleWidthMM: function () {
        var s = SHAN.spec;
        return (s.widthMM - s.marginsMM.inside - s.marginsMM.outside -
            (s.columns - 1) * s.gutterMM) / s.columns;
    },
    /* bounds 与返回坐标均为 pt；使用页边界，不假定左页 x=0。 */
    folioBounds: function (bounds, isLeft) {
        var p = SHAN.utils.pt;
        var outer = p(SHAN.spec.marginsMM.outside);
        var width = p(SHAN.utils.moduleWidthMM());
        var x = isLeft ? bounds[1] + outer : bounds[3] - outer - width;
        // 仅在已定义的下边距区域建立容器；最终基线由后续设计确认。
        return [bounds[2] - p(SHAN.spec.marginsMM.bottom), x,
            bounds[2], x + width];
    }
};
