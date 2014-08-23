/*The MIT License (MIT)

Copyright (c) 2014 Brackets PHP SIG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var AppInit                 = brackets.getModule("utils/AppInit"),
        CodeHintManager         = brackets.getModule("editor/CodeHintManager"),
        ExtensionUtils          = brackets.getModule("utils/ExtensionUtils"),
        TokenUtils              = brackets.getModule("utils/TokenUtils"),
        PreferencesManager      = brackets.getModule("preferences/PreferencesManager"),
        prefs                   = PreferencesManager.getExtensionPrefs("php-sig.php-smarthints");
    
    var phpBuiltins             = require("phpdata/php-predefined"),
        functionGroups          = require("text!phpdata/php-function-groups.json"),
        predefinedFunctions     = phpBuiltins.predefinedFunctions;
    
    /**
     * @constructor
     */
    function PHPHints() {
        this.lastTokenStart         = "";
        this.cachedPhpVariables     = [];
        this.cachedPhpConstants     = [];
        this.cachedPhpKeywords      = [];
        this.cachedPhpFunctions     = [];
        this.cachedLocalVariables   = [];
        this.tokenVariable          = /[$][\a-zA-Z_][a-zA-Z0-9_]*/g;
    }

    PHPHints.prototype.hasHints = function (editor, implicitChar) {
        this.editor = editor;
        var currentToken = "",
            i,
            cursor = editor.getCursorPos();
        this.initialContext = TokenUtils.getInitialContext(editor._codeMirror, cursor);
        
        currentToken = this.initialContext.token;
        // if implicitChar or 1 letter token is $, we *always* have hints so return immediately
        if (implicitChar === "$"  || currentToken.string.charAt(0) === "$") {
            return true;
        }
        // start at 2nd char unless explicit request then start immediately
        if (currentToken.string.length > 1 || implicitChar === null) {
            // do keywords first as they are common and small
            for (i = 0; i < this.cachedPhpKeywords.length; i++) {
                if (this.cachedPhpKeywords[i].indexOf(currentToken.string) === 0) {
                    return true;
                }
            }
            // do constants 2nd as they are also small
            for (i = 0; i < this.cachedPhpConstants.length; i++) {
                if (this.cachedPhpConstants[i].indexOf(currentToken.string) === 0) {
                    return true;
                }
            }
            // do functions last as the array is quite large
            for (i = 0; i < this.cachedPhpFunctions.length; i++) {
                if (this.cachedPhpFunctions[i].indexOf(currentToken.string) === 0) {
                    return true;
                }
            }
        }
        // nope, no hints
        return false;
    };

    PHPHints.prototype.getHints = function (implicitChar) {
        var currentToken =      "",
            i =                 0,
            hintList =          [],
            localVarList =      [],
            phpVarList =        [],
            phpFuncList =       [],
            phpConstList =      [],
            phpKeywordList =    [],
            $fHint,
            cursor =            this.editor.getCursorPos();

        currentToken = this.initialContext.token;

        if (currentToken === null) {
            return null;
        }
        // if it's a $variable, then build the local variable list
        if (implicitChar === "$"  || currentToken.string.charAt(0) === "$") {

            var varList = this.editor.document.getText().match(this.tokenVariable);
            console.log(varList.length);
            for (i = 0; i < varList.length; i++) {
                var word = varList[i];
                if (this.cachedLocalVariables.indexOf(word) === -1) {
                    this.cachedLocalVariables.push(word);
                }

            }

            if (this.cachedLocalVariables === null) {
                return null;
            }
            this.cachedLocalVariables.sort();
            // add unique local $variables
            for (i = 0; i < this.cachedLocalVariables.length; i++) {
                if (this.cachedLocalVariables[i].indexOf(currentToken.string) === 0) {
                    $fHint = $("<span>")
                        .addClass("PHPHint-completion")
                        .addClass("PHPHint-completion-localvar")
                        .text(this.cachedLocalVariables[i]);
                    localVarList.push($fHint);
                }
            }
            // load the predefined $variables next
            for (i = 0; i < this.cachedPhpVariables.length; i++) {
                if (this.cachedPhpVariables[i].indexOf(currentToken.string) === 0) {
                    $fHint = $("<span>")
                        .addClass("PHPHint-completion")
                        .addClass("PHPHint-completion-phpvar")
                        .text(this.cachedPhpVariables[i]);
                    phpVarList.push($fHint);
                }
            }
            // list is presented with local first then predefined
            hintList = localVarList.concat(phpVarList);
        } else {
            // not a $variable, could be a reserved word of some type
            // load keywords that match
            for (i = 0; i < this.cachedPhpKeywords.length; i++) {
                if (this.cachedPhpKeywords[i].indexOf(currentToken.string) === 0) {
                    $fHint = $("<span>")
                        .addClass("PHPHint-completion")
                        .addClass("PHPHint-completion-phpkeyword")
                        .text(this.cachedPhpKeywords[i]);
                    phpKeywordList.push($fHint);
                }
            }
            // load constants that match
            for (i = 0; i < this.cachedPhpConstants.length; i++) {
                if (this.cachedPhpConstants[i].indexOf(currentToken.string) === 0) {
                    $fHint = $("<span>")
                        .addClass("PHPHint-completion")
                        .addClass("PHPHint-completion-phpconstant")
                        .text(this.cachedPhpConstants[i]);
                    phpConstList.push($fHint);
                }
            }
            // load functions that match
            for (i = 0; i < this.cachedPhpFunctions.length; i++) {
                if (this.cachedPhpFunctions[i].indexOf(currentToken.string) === 0) {
                    $fHint = $("<span>")
                        .addClass("PHPHint-completion")
                        .addClass("PHPHint-completion-phpfunction")
                        .text(this.cachedPhpFunctions[i]);
                    phpFuncList.push($fHint);
                }
            }
            // munge all the lists together and sort
            hintList = phpKeywordList.concat(phpConstList, phpFuncList).sort();
        }

        return {
            hints: hintList,
            match: false,
            selectInitial: true,
            handleWideResults: false
        };
    };

    PHPHints.prototype.insertHint = function ($hint) {
        var cursor              = this.editor.getCursorPos(),
            currentToken        = this.editor._codeMirror.getTokenAt(cursor),
            replaceStart        = {line: cursor.line, ch: currentToken.start},
            replaceEnd          = {line: cursor.line, ch: cursor.ch};

        this.editor.document.replaceRange($hint.text(), replaceStart, replaceEnd);
        return false;
    };
    
    var phpHints = new PHPHints();

    function buildFunctionsList(selectedFunctions) {
        var i = 0,
            fnArray             = [],
            fg                  = JSON.parse(functionGroups),
            fgKey;
        predefinedFunctions.length = 0;
        predefinedFunctions = phpBuiltins.predefinedFunctions;

        Object.keys(fg).forEach(function (key) {
            fgKey = fg[key];

            if (selectedFunctions.length > 0) {
                if (selectedFunctions.indexOf(key) > -1) {
                    fnArray = fgKey.fnNames.join('\n').split('|');
                    for (i = 0; i < fnArray.length; i++) {
                        predefinedFunctions.push(fnArray[i]);
                    }
                }
            } else {
                fnArray = fgKey.fnNames.join('\n').split('|');
                for (i = 0; i < fnArray.length; i++) {
                    predefinedFunctions.push(fnArray[i]);
                }
            }
        });
        return predefinedFunctions;
    }

    function createHintArray(rawList) {
        var sortedRawList   = rawList.sort(),
            i               = 0,
            currentWord     = "",
            finalList       = [];

        for (i = 0; i < sortedRawList.length; i++) {
            currentWord = sortedRawList[i];
            if (finalList.indexOf(currentWord) === -1) {
                finalList.push(currentWord);
            }
        }
        return finalList;
    }

    function handlePrefs(selectedFunctions) {
        var fnList = [];
        fnList = buildFunctionsList(selectedFunctions);
        phpHints.cachedPhpFunctions.length = 0;
        phpHints.cachedPhpFunctions = createHintArray(fnList);
    }

    AppInit.appReady(function () {
        prefs.definePreference("filteredFunctionList", "array", [])
            .on("change", function () {
                handlePrefs(prefs.get("filteredFunctionList"));
            });
        // register the provider.  Priority = 10 to be the provider of choice for php
        CodeHintManager.registerHintProvider(phpHints, ["php"], 10);
        handlePrefs(prefs.get("filteredFunctionList"));
        phpHints.cachedPhpKeywords = createHintArray(phpBuiltins.keywords);
        phpHints.cachedPhpConstants = createHintArray(phpBuiltins.predefinedConstants);
        phpHints.cachedPhpVariables = createHintArray(phpBuiltins.predefinedVariables);

        ExtensionUtils.loadStyleSheet(module, "css/main.css");
    });
});
