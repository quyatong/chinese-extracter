var utils = require('./utils');

module.exports = function (line, origin) {
    var bucket = [];
    origin.replace(
        /(([^<>\s]+\s*)|([^<>\s]*))?(<\s*\/?\s*[a-zA-Z]+[0-9]?.*?\s*>)?(([^<>\s]+\s*)|([^<>\s]*))?/g,
        function (match, pretext, prehasspace, prenospace, tag, sufspace, suftext, sufhasspace, sufnospace) {
        if (pretext) {
            bucket.push({
                type: 'text',
                value: pretext
            });
        }

        if (tag) {
            if (/(<\s*(.*)\s*\/\s*>)|(input)|(br)/g.test(tag)) {
                bucket.push({
                    type: 'tag',
                    value: tag
                });
            }
            else if (!/\//.test(tag)) {
                bucket.push({
                    type: 'opentag',
                    value: tag
                });
            }
            else {
                bucket.push({
                    type: 'closetag',
                    value: tag
                });
            }
        }

        if (suftext) {
            bucket.push({
                type: 'text',
                value: suftext
            });
        }
    });
    var result = utils.validate(bucket);
    var segs = [];

    if (result.attr.length) {
        segs = segs.concat(result.attr);
    }
    if (result.text) {
        segs.push(result.text);
    }
    var handleLine = line;
    segs.forEach(function (item) {

        line = line.replace(new RegExp(
            item.replace(/\+/g, '\\\+')
                .replace(/\?/g, '\\\?')
                .replace(/\./g, '\\\.')
                .replace(/\*/g, '\\\*')
                .replace(/\{/g, '\\\{')
                .replace(/\}/g, '\\\}')
                .replace(/\)/g, '\\\)')
                .replace(/\(/g, '\\\('),
                'ig'
            ),
            function () {
                return '__i18n(' + item + ')';
            }
        );
    });

    var newLine = origin.replace(handleLine, line);
    return {
        newLine: newLine,
        segs: segs
    };
};
