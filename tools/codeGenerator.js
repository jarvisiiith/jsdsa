/**
 * CodeGenerator:
 *  Description: Used to generate the outline of the code required for jsdsa
 *  Contributors: <@ironmaniiith aalekhj2507@gmail.com>
 */

/** Require calls */
var inquirer = require('inquirer'),
    fs = require('fs'),
    isFileExist = require('./isFileExist'),
    fileWriter = require('./fileWriter');

/** Cache methods or assign Globals */
var VARTYPES = ['Required', 'Optional', 'Undocumented'],
    VARCHOICES = ['String', 'Array', 'Number', 'Boolean', 'Object', 'Function', 'Null', 'Other'],
    FILENAME = '',
    FILEPATH = __dirname + '/../jsdsa/';
    slice = Array.prototype.slice,
    splice = Array.prototype.splice,
    toString = Object.prototype.toString,
    getKeys = Object.keys,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    nonEmpty = function(e){ return e != '' },
    simpleReturn = function(o){ return o },
    prettify = function(){ console.log(JSON.stringify.apply(null, slice.call(arguments))) },
    sections = [],
    processedSections = [];

/**
 *  commentify:
 *      Add multiline comment (like what is applied to this description) to a section texts array
 *
 *  Required:
 *  @param {Array} [sectionTexts] Array containing the exact structure that needs to be written in file
 *
 *  @returns {Array} Modified sectionTexts array
 */
function commentify(sectionTexts) {
    var newSectionTexts = [];
        length = sectionTexts.length;

    newSectionTexts.push('/**');
    sectionTexts.forEach(function(val){
        newSectionTexts.push(' * ' + val);
    });
    newSectionTexts[length] = ' */'; // Last line need to be comments' closing
    return newSectionTexts;
}

/**
 *  constructSection: 
 *      Construct the section object for inquirer according to the info object
 *
 *  Required:
 *  @param {Object} [info] A single info object
 *
 *  Optional:
 *  @param {Function} [cb] The callback function that will be combined with section object 
 *
 *  @returns {Function} Returns the callback
 */
function constructSection(info, cb) {
    cb = cb || simpleReturn;
    !!info['main'] && (info = info['main']);
    var section = [];

    for (var key in info) {
        var type = 'input',
            message = info[key],
            details = {
                name: key,
                type: type,
                message: message
            };
        if (typeof message === 'object') { // supports object assignment other params
            for (var detail in message) {
                details[detail] = message[detail];
            }
        }
        section.push(details);
    }
    return cb(section);
}

var infos = [
        { /* Zeroth section bhagwan ke naam, I am an Indian B-) */
            main: {

            },
            extras: {
                seperator: '',
                prefix: '',
                suffix: '',
                startWith: '',
                endWith: '',
                replacer: '' // If replacer is present, then above may not be required
            }
        },
        { /* First section, the introduction section */
            main: {
                '<Name>' : 'Name of the Algorithm/DataStructure [M]:', // Name should always be first
                'Class' : 'Class (Ex. Sorting) [O]:',
                'Data Structure' : 'Data Structure involved (Ex. Array) [O]:',
                'Time Complexity' : 'Time Complexity (Ex. O(logn)) [O]:',
                'Description' : 'Description [O]:',
                'Resources' : 'Resource [O]:',
                'Extras' : 'Extras (any extra relevant info or link) [O]:',
                'Contributors' : 'Your Name and Emailid (add yourself as contributor) [O]:'
            },
            extras: {
                seperator: ': ',
                prefix: ' ',
                suffix: '\n',
                startWith: '',
                endWith: '\n'
            }
        },
        { /* Second section, the Require Calls section */
            main: {
                '<Var>' : 'Enter the variable name to store the module [M]:',
                '<ModuleName>': 'Name of the Module to require [M]:'
            },
            extras: {
                intro: '/** Require calls */\n',
                prefix: '    ',
                suffix: ',\n',
                startWith: 'var ',
                endWith: ';',
                replacer: '<Var> = require(\'<ModuleName>\')',
                multiple: true,
                multipleMessage: 'How many modules to require?:'
            }
        },
        { /* Third section, cache the methods to call later */
            main: {
                '<Var>': 'Enter the variable name to store method/value [M]:',
                '<Method>': 'Method to Cache/Value of Global variable [M]:'
            },
            extras: {
                intro: '/** Cache methods or assign Globals */\n',
                prefix: '    ',
                suffix: ',\n',
                startWith: 'var ',
                endWith: ';',
                replacer: '<Var> = <Method>',
                multiple: true,
                multipleMessage: 'Number of methods to cache/Global values?:'
            }
        },
        { /* Fourth section, give the function name and description */
            main: {
                '<FunctionName>': 'Name of the Function [M]:' ,
                '<ShortDescription>': 'Short description of the function [O]:'
            },
            extras: {
                replacer: ' <FunctionName>:\n     <ShortDescription>\n'
            }
        },
        { /* Fifth section, give parameter type, name and description */
            main: {
                '<ParamName>': 'Give the parameter name [M]:',
                '<Type>': {
                    type: 'rawlist',
                    message: 'Type of parameter [M]:',
                    choices: VARTYPES
                },
                '<VarType>': {
                    type: 'list',
                    message: 'Variable type of parameter [M]:',
                    choices: VARCHOICES
                },
                '<ShortParamDescription>': 'Short description for this parameter [O]:'
            },
            extras: {
                replacer: ' <Type>:\n @param {<VarType>} [<ParamName>] <ShortParamDescription>\n',
                multiple: true,
                multipleMessage: 'Number of parameters of the function?:'
            }
        },
        { /* Sixth section, export module */
            main: {
                '<FunctionName>': {
                    type: 'input',
                    message: 'Name of the function to export [O]:',
                    default: function(){ return 'testFunc' }
                },
                '<ModuleName>': {
                    type: 'input',
                    message: 'Name of the module to export [O]:',
                    default: function(){ return 'testModule' }
                }
            },
            extras: {
                prefix: '',
                suffix: ';\n',
                intro: '/** Export the function as module */\n',
                replacer: 'module.exports.<ModuleName> = <FunctionName>'
            }
        }
    ],
    multipleInput = {
        type: 'input',
        name: 'count',
        message: 'Multiple input demo message',
        validate: function(e) {
            return e == e << 0 && nonEmpty(e);
        }
    };

/** Construct each section from infos object */
infos.forEach(function(val){
    var section = constructSection(val);
    sections.push(section);
});

/**
 *  sentenceGenerator:
 *      Construct the sentence with the given key, value and seperator from info object
 *
 *  Required:
 *  @param {String} [key] Key from the info object
 *  @param {String} [value] Corresponding value of the given key in info object
 *  @param {String} [seperator] The seperator used for generating the sentence
 *
 *  @returns {String} The sentence generated based on the key, value and seperator pairs
 */
function sentenceGenerator(key, value, seperator) {
    var start = key[0],
        end = key[key.length - 1];

    if (start === '<' && end === '>') {
        return value + seperator;
    } else if (start === '<') {
        return value + seperator;
    } else if (end === '>') {
        return value;
    } else {
        return key + seperator + value;
    }
}

function processAnswers(answers, info) {
    var sentences = [],
        extras = info['extras'],
        intro = extras['intro'],
        prefix = extras['prefix'] || '',
        suffix = extras['suffix'] || '',
        startWith = extras.hasOwnProperty('startWith') ? extras['startWith'] : prefix,
        endWith = extras.hasOwnProperty('endWith') ? extras['endWith'] : suffix,
        replacer = extras['replacer'],
        keys = getKeys(extras);

    if (toString.call(answers) !== '[object Array]') {
        answers = [answers];
    }

    if (replacer) {
        answers.forEach(function(answer) {
            var replacedSentence = replacer;
            for (var key in answer) {
                replacedSentence = replacedSentence.replace(key, answer[key]);
            }
            replacedSentence = prefix + replacedSentence + suffix;
            sentences.push(replacedSentence);
        });
    } else {
        var seperator = extras['seperator'];
        answers.forEach(function(answer) {
            for (var key in answer) {
                var sentence = prefix + sentenceGenerator(key, answer[key], seperator) + suffix;
                sentences.push(sentence);
            }
        });
    }
    var length = sentences.length;
    if (length) {
        sentences[0] = sentences[0].replace(prefix, startWith); // Replace prefix with startWith
        sentences[length - 1] = sentences[length - 1].replace(new RegExp(suffix + '$'), endWith); // Replace suffix with endWith
    }

    if (intro) { // Intentionally at the last
        sentences.unshift(intro);
    }
    return sentences;
}

function splitter(string, seperator, condition) {
    var splittedValues = string.split(seperator);
    if (condition) {
        splittedValues = splittedValues.filter(condition);
    }
    return splittedValues;
}

function preprocessor() {
    processedSections.forEach(function(val, index, array) {
        val = val.reduce(function(prev, curr) {
            return prev + curr;
        });
        array[index] = splitter(val, '\n');
    });
    processedSections[0] = commentify(processedSections[0]);

    var section4 = processedSections[4],
        newSection4 = {};
    for (var i = 0; i < section4.length; i += 2) {
        var first = section4[i],
            second = section4[i+1];
        if (!(first in newSection4)) {
            newSection4[first] = [];
        }
        if (second)
            newSection4[first].push(second);
    }
    section4 = [];
    for (var property in newSection4) {
        if (hasOwnProperty.call(newSection4, property)) {
            section4.push(property);
            var entries = newSection4[property];
            if (entries.length) {
                entries.forEach(function(val) {
                    section4.push(val)
                });
                section4.push('');
            }
        }
    }
    processedSections[4] = section4;
    processedSections[3] = commentify(processedSections[3].concat(processedSections[4]));
    processedSections[3].push('function FunctionName(arguments) {\n    // code\n}');
    splice.call(processedSections, 4, 1);
}

function repeater(section, count, index, allAnswers) {
    var args = slice.call(arguments),
        next = args[4],
        nextArgs = args[5];
    if (args[1]--) {
        inquirer.prompt(section).then(function(answers) {
            allAnswers.push(answers);
            console.log('');
            repeater.apply(null, args);
        });
        return;
    }
    var sentences = processAnswers(allAnswers, infos[index]);
    processedSections.push(sentences);
    next.apply(null, nextArgs);
}

function final() {
    preprocessor();
    processedSections.forEach(function(val, index, array) {
        var text = (index ? '\n\n' : '') + val.join('\n');
        fileWriter(FILENAME, text);
    });
    console.log('File ' + BASEFILE + ' successfully written...');
}

function run(section, index, sections) {
    var info = infos[index],
        extras = info['extras'];

    if (extras['multiple']) {
        var question = multipleInput,
            message;
        !!(message = extras['multipleMessage']) && (question['message'] = message);
        inquirer.prompt(multipleInput).then(function(answers) {
            var count = answers['count'] << 0,
                allAnswers = [];
            repeater(section, count, index, allAnswers, run, [sections[++index], index, sections]);
        });
    } else {
        inquirer.prompt(section).then(function(answers) {
            console.log('');
            // prettify(answers, null, '  ');
            var sentences = processAnswers(answers, infos[index]);
            processedSections.push(sentences);
            if (sections[++index]) {
                run.call(null, sections[index], index, sections);
            } else {
                final();
            }
        });
    }
}

var fileNameQuestion = [
        {
            type: 'input',
            name: 'filename',
            message: 'Enter the file name:'
        }
    ],
    fileExistConfirmation = [
        {
            type: 'expand',
            message: 'File already exists, do you want to overwrite?',
            name: 'overwrite',
            choices: [
                {
                    key: 'y',
                    name: 'Yes',
                    value: true
                },
                {
                    key: 'n',
                    name: 'No',
                    value: false
                }
            ]
        }
    ];

function getFileName() {
    inquirer.prompt(fileNameQuestion).then(function(fileNameObj) {
        if (isFileExist(FILEPATH + fileNameObj['filename'])) {
            inquirer.prompt(fileExistConfirmation).then(function(answers) {
                if (!answers['overwrite']) {
                    getFileName();
                } else {
                    BASEFILE = fileNameObj['filename'];
                    FILENAME = FILEPATH + BASEFILE;
                    main();
                }
            });
        } else {
            BASEFILE = fileNameObj['filename'];
            FILENAME = FILEPATH + BASEFILE;
            main();
        }
    });
}

function main() {
    if (!FILENAME) {
        getFileName();
    } else {
        run(sections[1], 1, sections);
    }
}
main();
