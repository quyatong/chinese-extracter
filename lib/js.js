var zhReg = /((([0-9]+(\.[0-9]+)?(\.[0-9]+)?)?([qQ]*(?=[\u4e00-\u9fa5]))?[\u4e00-\u9fa5]+.*?[,.，。：:；\-！\/￥”“%…？、0-9\u4e00-\u9fa5a-zA-Z]*))/g;

module.exports = function (line, origin) {
    var segs = [];

    var newLine = origin.replace(
        line,
        line.replace(new RegExp(zhReg), function (seg) {
            segs.push(seg);
            return '__i18n(' + seg + ')';
        })
    );

    return {
        newLine: newLine,
        segs: segs
    };
};
