var utils = require('./utils');

module.exports = function (line) {
    var bucket = [];
    line.replace(
        /(([^<>\s]+\s*)|([^<>\s]*))?(<\s*\/?\s*[a-zA-Z]+[0-9]?.*?\s*>)?(([^<>\s]+\s*)|([^<>\s]*))?/g,
        function (match, pretext, prehasspace, prenospace, tag, sufspace, suftext, sufhasspace, sufnospace) {
        if (pretext) {
            bucket.push({
                type: 'text',
                value: pretext
            });
        }

        if (tag) {
            if (/(<\s*(.*)\s*\/\s*>)|(input)/g.test(tag)) {
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
    return segs;
};
