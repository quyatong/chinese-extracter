var fs = require('fs');
var path = require('path');
var readDir = require('readdir');
var html = require('./lib/html');
var js = require('./lib/js');
var utils = require('./lib/utils');

var zhReg = /[\u4e00-\u9fa5]+/g;
var reg = /((([0-9]+(\.[0-9]+)?(\.[0-9]+)?)|[\u4e00-\u9fa5])+.*([,.，。：:；\-！\/￥%…？、~]|([0-9]+(\.[0-9]+)?(\.[0-9]+)?)|[a-zA-Z\u4e00-\u9fa5])*)|(<%.*?%>)|(\{\$.*?\})/g;
var all = [];

/**
 * 分析文件
 *
 * @param  {string} file        文件路径
 * @param  {string} dir         目录路径
 * @param  {string} projectPath 工程目录
 */
var analyzeFile = function (file, dir, projectPath) {
    var scriptInHtml = false;
    var origin = fs.readFileSync(file, 'utf8');
    content = origin
    // 删除 // 注释
    .replace(/\/\/.*\n/g, '\n')
    // 删除 <!-- --> 注释
    .replace(/<!--[\S\s]*?-->/g, utils.replaceByNewLine)
    // 删除 /**/ 注释
    .replace(/\/\*[\S\s]*?\*\//g, utils.replaceByNewLine)
    // 删除 {**} 注释
    .replace(/\{\*.*?\*\}/g, '')
    .replace(/__i18n\((.*?)\)/g, function (match, content) {return content;})

    // // 删除< div xxxx="xxxx" >标签
    // .replace(/\n\s*<\s*?.*?\s*?>/g, replaceByNewLine)
    // // 删除</div>标签
    // .replace(/\n<\s*?\/\s*.*?\s*?>/g, replaceByNewLine)
    // 删除console.log
    .replace(/console\.log.*/ig, '')
    .replace(/Console\.log.*/ig, '')
    // 删除异常
    .replace(/throw\s+.*/g, '');


    if (origin.split('\n').length != content.split('\n').length) {
        throw new Error('程序出错');
    }

    var lines = [];

    origin = origin.split(/\n/g);

    content.split(/\n/g).forEach(function (line, linenum) {

        if (!new RegExp(zhReg).test(line) && (!/<\s*\/?\s*script/g.test(line))) {
            return;
        }
        // console.log(/\.(html|tpl|tmpl)$/g.test(file));
        var result = {};

        // html
        if(/\.(html|tpl|tmpl)$/g.test(file)) {

            if (!scriptInHtml) {
                result = html(line, origin[linenum]);
            }
            else {
                result = js(line, origin[linenum]);
            }

            if (/<\s*?script.*?>/.test(line)) {
                scriptInHtml = true;
            }
            else if (/<\s*\/\s*?script.*?>/.test(line)) {
                scriptInHtml = false;
            }
        }
        else if (/\.(js)$/g.test(file)) {
            result = js(line, origin[linenum]);
        }
        else {
            result = js(line, origin[linenum]);
        }

        if (/<\s*\/?\s*script/g.test(line)) {
            return;
        }

        lines.push(
            {
                linenum: linenum,
                content: result.segs,
                newLine: result.newLine,
                origin: origin[linenum],
                file: path.basename(projectPath) + file.replace(projectPath, ''),
                project: path.basename(projectPath)
            }
        )
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

    readDir
        .readSync(dir, ['**.js', '**.tmpl', '**.tpl', '**.html'], readDir.ABSOLUTE_PATHS)
        .forEach(function (file) {
            var lines = analyzeFile(file, dir, projectPath);

            if (lines.length) {
                lines.forEach(function (line) {
                    line.content && line.content.forEach(function (seg) {
                        lang.push({
                            zh: seg,
                            pt: '',
                            en: ''
                        });
                    });
                });
            }

            utils.handleFile(file, lines);
        });

    if (lang.length) {



        fs.writeFileSync(dir + '/lang.json', JSON.stringify(utils.unique(lang), null, 2));
    }
};



/**
 * 分析页面
 *
 * @param  {string} dir         页面目录
 * @param  {string} projectPath 工程目录
 */
var analyzePages = function (dir, projectPath) {
    var lang = [];
    readDir
        .readSync(dir, ['*/'],
            readDir.ABSOLUTE_PATHS + readDir.INCLUDE_DIRECTORIES + readDir.NON_RECURSIVE
        )
        .forEach(function (dir) {
            analyzePage(dir, projectPath);
        });

    if (all.length) {
        fs.writeFileSync(projectPath + '/lang.json', JSON.stringify(all, null, 2));
    }
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
            analyzePages(dir, projectPath);
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
        // all = unique(all).map(function (item) {
        //     return item.project + '\t' + '\t' + item.content.join(' ') + '\n'
        //         + item.project + '\t' + '\t' + item.origin + '\n';
        // });
    }
    else if (program.files && program.files.length) {
        program.files.forEach(function (file) {
            var lines = analyzeFile(file, path.dirname(file), cwd);
            utils.handleFile(file, lines);
        });
    }
    else {
        analyzeProject(cwd);
    }

    fs.writeFileSync(cwd + '/lang.json', JSON.stringify(all, null, 2));
};
