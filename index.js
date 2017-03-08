var fs = require('fs');
var path = require('path');
var readDir = require('readdir');

var all = [];

/**
 * 去重函数
 *
 * @param  {Array} lines 行列表
 * @return {Array}       去重行
 */
var unique = function (lines) {
    var result = [];
    var tmp = {};

    lines.forEach(function (line) {
        if (tmp[line.content]) {
            if (tmp[line.content].linenum.indexOf(line.linenum) == -1) {
                tmp[line.content].linenum.push(line.linenum);
            }
        }
        else {
            var obj = {
                linenum: [line.linenum],
                content: line.content,
                origin: line.origin,
                file: line.file,
                project: line.project
            };
            tmp[line.content] = obj;
            result.push(obj);
        }
    });

    return result;
};

/**
 * 处理文件
 *
 * @param  {string} file  文件路径
 * @param  {Array}  lines 行列表
 * @return {Array}        语言列表
 */
var handleFile = function (file, lines) {

    var lang = [];
    var content = fs.readFileSync(file, 'utf8').replace(/__i18n\((.*?)\)/g, function (match, content) {return content;});

    lines.forEach(function (line) {
        line.content.forEach(function (item) {
            content = content.replace(item, '__i18n(' + item + ')');

            lang.push({
                zh: item,
                en: ''
            });
        });
    });

    fs.writeFileSync(file, content);

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

/**
 * 分析文件
 *
 * @param  {string} file        文件路径
 * @param  {string} dir         目录路径
 * @param  {string} projectPath 工程目录
 */
var analyzeFile = function (file, dir, projectPath) {

    var origin = fs.readFileSync(file, 'utf8');

    content = origin
    // 删除 // 注释
    .replace(/\/\/.*\n/g, '\n')
    // 删除 <!-- --> 注释
    .replace(/<!--[\S\s]*?-->/g, replaceByNewLine)
    // 删除 /**/ 注释
    .replace(/\/\*[\S\s]*?\*\//g, replaceByNewLine)
    // 删除 {**} 注释
    .replace(/\{\*.*?\*\}/g, '')
    .replace(/__i18n\((.*?)\)/g, function (match, content) {return content;})
    // 删除dd5
    .replace(/dd5/g, '')
    .replace(/<\s*br\s*\/?\s*>/g, ' ')

    // 删除< div xxxx="xxxx" >标签
    .replace(/<\s*?.*?\s*?>/g, '')
    // 删除</div>标签
    .replace(/<\s*?\/\s*.*?\s*?>/g, '');


    if (origin.split('\n').length != content.split('\n').length) {
        console.log('--------------------------------------------------');
        console.log(origin);
        console.log('==================================================');
        console.log(content);
    }

    var lines = [];

    origin = origin.split(/\n/g);

    content.split(/\n/g).forEach(function (line, linenum) {
        var segs = [];

        line.replace(
            /((([0-9]+(\.[0-9]+)?(\.[0-9]+)?)|[\u4e00-\u9fa5，。：；（）\-！\/￥%…？、“”])+)|(<%.*?%>)|(\{\$.*?\})/g,
            function (match) {
                segs.push(match);
            }
        );

        if (segs.length) {

            segs = segs.filter(function (seg) {
                if (/([\u4e00-\u9fa5]+)/g.test(seg)) {
                    return true;
                }
                else {
                    return false;
                }
            });

            if (segs.length) {
                lines.push({
                    linenum: (linenum + 1),
                    content: segs,
                    origin: origin[linenum],
                    file: path.basename(projectPath) + file.replace(projectPath, ''),
                    project: path.basename(projectPath)
                });
            }
        }
    });
    return lines;
};

/**
 * 分析页面
 *
 * @param  {string} dir         页面目录
 * @param  {string} projectPath 工程目录
 */
var analyzePage = function (dir, projectPath) {
    var lang = [];

    readDir.readSync(dir, ['**.js', '**.tmpl', '**.tpl', '**.html'], readDir.ABSOLUTE_PATHS)
        .forEach(function (file) {
            var lines = analyzeFile(file, dir, projectPath);
            all = all.concat(lines);
            lang = lang.concat(handleFile(file, unique(lines)));
        });

    fs.writeFileSync(dir + '/lang.json', JSON.stringify(lang, null, 2));
};

/**
 * 分析工程
 *
 * @param  {string} projectPath 工程目录
 */
var analyzeProject = function (projectPath) {
    var project = [];

    readDir
        .readSync(
            projectPath + '/',
            ['template/', 'page/', 'component_modules/', 'components/'],
            readDir.ABSOLUTE_PATHS + readDir.INCLUDE_DIRECTORIES + readDir.NON_RECURSIVE
        )
        .forEach(function (dir) {
            analyzePage(dir, projectPath);
        });

};

/**
 * 入口文件
 *
 * @param  {Object} program commander实例
 */
exports.enter = function (program) {
    var cwd = process.cwd();
    if (program.projects && program.projects.length) {

        program.projects.forEach(function (project) {
            analyzeProject(cwd + '/' + project);
        });

        all = unique(all).map(function (item) {
            return item.project + '\t' + '\t' + item.content.join(' ') + '\n'
                + item.project + '\t' + '\t' + item.origin + '\n';
        });

        fs.writeFileSync(cwd + '/all.txt', all.join('\n'));
    }
    else {
        analyzeProject(cwd);
    }
};
