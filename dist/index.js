'use strict';

var Prism = require('prismjs');
var Slate = require('slate');
var React = require('react');
require('prismjs/components/prism-apacheconf.min');
require('prismjs/components/prism-aspnet.min');
require('prismjs/components/prism-bash.min');
require('prismjs/components/prism-batch.min');
require('prismjs/components/prism-csharp.min');
require('prismjs/components/prism-java.min');
require('prismjs/components/prism-json.min');
require('prismjs/components/prism-lua.min');
require('prismjs/components/prism-nginx.min');
require('prismjs/components/prism-powershell.min');
require('prismjs/components/prism-python.min');
require('prismjs/components/prism-r.min');
require('prismjs/components/prism-ruby.min');
require('prismjs/components/prism-scss.min');
require('prismjs/components/prism-sql.min');
require('prismjs/components/prism-swift.min');
require('prismjs/components/prism-wiki.min');

var MARK_TYPE = 'prism-token';

/**
 * Default filter for code blocks
 * @param {Node} node
 * @return {Boolean}
 */
function defaultOnlyIn(node) {
    return node.kind === 'block' && node.type === 'code_block';
}

/**
 * Default getter for syntax
 * @param {Node} node
 * @return {String}
 */
function defaultGetSyntax(node) {
    return 'javascript';
}

/**
 * Default rendering for tokens
 * @param {Object} props
 * @param {Slate.Mark} props.mark
 * @return {React.Element}
 */
function defaultTokenRender(props) {
    var mark = props.mark;

    var className = mark.data.get('className');
    return React.createElement(
        'span',
        { className: className },
        props.children
    );
}

/**
 * A Slate plugin to handle keyboard events in code blocks.
 * @return {Object}
 */

function PrismPlugin(opts) {
    opts = opts || {};
    opts.onlyIn = opts.onlyIn || defaultOnlyIn;
    opts.getSyntax = opts.getSyntax || defaultGetSyntax;
    opts.renderToken = opts.renderToken || defaultTokenRender;

    function decorate(text, block) {
        var characters = text.characters.asMutable();
        var string = text.text;
        var grammarName = opts.getSyntax(block);
        var grammar = Prism.languages[grammarName];

        if (!grammar) {
            return text.characters;
        }

        var tokens = Prism.tokenize(string, grammar);
        var offset = 0;

        function addMark(start, end, className) {
            for (var _i = start; _i < end; _i++) {
                var char = characters.get(_i);
                var _char = char,
                    marks = _char.marks;

                marks = marks.add(Slate.Mark.create({ type: MARK_TYPE, data: { className: className } }));
                char = char.merge({ marks: marks });
                characters = characters.set(_i, char);
            }
        }

        function processToken(token, accu) {
            accu = accu || '';

            if (typeof token === 'string') {
                if (accu) {
                    addMark(offset, offset + token.length, 'prism-token token ' + accu);
                }
                offset += token.length;
            } else {
                accu = accu + ' ' + token.type + ' ' + (token.alias || '');

                if (typeof token.content === 'string') {
                    addMark(offset, offset + token.content.length, 'prism-token token ' + accu);
                    offset += token.content.length;
                }

                // When using token.content instead of token.matchedStr, token can be deep
                else {
                        for (var i = 0; i < token.content.length; i++) {
                            processToken(token.content[i], accu);
                        }
                    }
            }
        }

        for (var i = 0; i < tokens.length; i++) {
            processToken(tokens[i]);
        }

        return characters.asImmutable();
    }

    return {
        schema: {
            rules: [{
                match: opts.onlyIn,
                decorate: decorate
            }, {
                match: function match(object) {
                    return object.kind === 'mark' && object.type === MARK_TYPE;
                },
                render: opts.renderToken
            }]
        }
    };
}

module.exports = PrismPlugin;