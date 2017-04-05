var zhReg = /((([0-9]+(\.[0-9]+)?(\.[0-9]+)?)?([a-zA-Z]*(?=[\u4e00-\u9fa5]))?[\u4e00-\u9fa5]+.*?[,.，。：:；\-！\/￥”“%…？、0-9\u4e00-\u9fa5a-zA-Z]*))/g;

module.exports = function (line) {

    var segs = [];
    line.replace(zhReg, function (seg) {
        segs.push (seg);
    });

    return segs;
};
