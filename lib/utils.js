var fs = require('fs');
var zhReg = /(([\u4e00-\u9fa5]+[,.，。：:；\-！\/￥%…？、\u4e00-\u9fa5]*)|([,.，。：:；\-！\/￥%…？、]+[\u4e00-\u9fa5]+))/g;


/**
 * 处理文件
 *
 * @param  {string} file  文件路径
 * @param  {Array}  lines 行列表
 * @return {Array}        语言列表
 */
var handleFile = function (file, lines) {

    var lang = [];
    var content = fs.readFileSync(file, 'utf-8').split(/\n/);

    lines.forEach(function (line) {
        content[line.linenum] = line.newLine;
    });
    fs.writeFileSync(file, content.join('\n'));
    return lang;
};



/**
 * 使用新行替换
 *
 * @param  {string} match
 * @return {string}       [description]
 */
var replaceByNewLine = function (match) {
    var lines = match.match(/\n/g);
    return lines ? lines.join('') : '';
};

var isPureText = function (bucket) {
    var result = true;
    bucket.forEach(function (item) {
        if (item.type != 'text') {
            result = false;
        }
    });
    return result;
};


var getTagCount = function (bucket) {
    var result = {
        open: 0,
        close: 0
    };

    bucket.forEach(function (item) {
        if (item.type == 'opentag') {
            result.open++;
        }
        else if (item.type == 'closetag') {
            result.close++;
        }
    });

    return result;
};

var normalize = function (text) {
    return text.replace(/<\s*\/?\s*(\S+)\s*.*>/g, '$1');
};

var validate = function (bucket) {
    var newBucket = [];
    var result = [];
    var i = 0;
    var j = bucket.length - 1;
    var counts = getTagCount(bucket);
    var start = [];
    var end = [];
    var m = 0;
    var n = 0;
    var startPoint = 0;
    var endPoint = bucket.length - 1;

    while (i < j) {
        var opentag;
        var closetag;
        for (; i < j; i++) {
            if (bucket[i].type == 'opentag') {
                if (m >= (counts.open - counts.close)) {
                    startPoint = i;
                    opentag = bucket[i];
                    start.push(opentag);
                    i++;
                    break;
                }
                else {
                    m++;
                }
            }
            else {
                start.push(bucket[i]);
            }
        }

        for (; j >= i; j--) {
            if (bucket[j].type == 'closetag') {
                if (n >= (counts.close - counts.open)) {
                    closetag = bucket[j];
                    endPoint = j;
                    end.unshift(closetag);
                    j--;
                    break;
                }
                else {
                    n++;
                }
            }
            else {
                end.unshift(bucket[j]);
            }
        }
    }
    for (i; i <= j; i++) {
        start.push(bucket[i]);
    }

    var temp = start.concat(end);
    var stack = [];
    var tags = [];

    for (var i = 0; i < 3; i++) {
        if (
            temp[0]
            && (temp[0].type == 'opentag')
            && (temp[temp.length - 1].type == 'closetag')
            && (normalize(temp[0].value) == normalize(temp[temp.length - 1].value))
        ) {
            tags.push(temp.shift());
            tags.push(temp.pop());
        }
        else {
            break;
        }
    }
    var attr = [];

    tags.forEach(function (tag) {
        tag.value.replace(zhReg, function (match) {
            attr.push(match);
        })
    });

    var text = temp
        .filter(function (item) {
            if (/input/g.test(item.value)) {
                item.value.replace(zhReg, function (match) {
                    attr.push(match);
                })
                return false;
            }
            return true;
        })
        .reduce(function (prev, item) {
            return prev + item.value;
        }, '');

    return {
        attr: attr,
        text: text
    };
};


/**
 * 去重函数
 *
 * @param  {Array} lines 行列表
 * @return {Array}       去重行
 */
var unique = function (lines) {
    var result = [];
    var tmp = {};

    return lines.filter(function (item) {
        if (!tmp[item.zh]) {
            tmp[item.zh] = true;
            return true;
        }
        return false;
    });
};



module.exports = {
    replaceByNewLine: replaceByNewLine,
    validate: validate,
    handleFile: handleFile,
    unique: unique
};
