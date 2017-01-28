const Prism = require('prismjs');
const Slate = require('slate');
const React = require('react');
require('prismjs/components/prism-apacheconf');
require('prismjs/components/prism-aspnet');
require('prismjs/components/prism-bash');
require('prismjs/components/prism-batch');
require('prismjs/components/prism-java');
require('prismjs/components/prism-json');
require('prismjs/components/prism-lua');
require('prismjs/components/prism-nginx');
require('prismjs/components/prism-powershell');
require('prismjs/components/prism-python');
require('prismjs/components/prism-r');
require('prismjs/components/prism-ruby');
require('prismjs/components/prism-sass');
require('prismjs/components/prism-scss');
require('prismjs/components/prism-sql');
require('prismjs/components/prism-swift');
require('prismjs/components/prism-wiki');

const MARK_TYPE = 'prism-token';

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
    var { mark } = props;
    var className = mark.data.get('className');
    return <span className={className}>{props.children}</span>;
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
        let characters = text.characters.asMutable();
        const string = text.text;
        const grammarName = opts.getSyntax(block);
        const grammar = Prism.languages[grammarName];

        if (!grammar) {
            return text.characters;
        }

        const tokens = Prism.tokenize(string, grammar);
        let offset = 0;

        function addMark(start, end, className) {
            for (let i = start; i < end; i++) {
                let char = characters.get(i);
                let { marks } = char;
                marks = marks.add(Slate.Mark.create({ type: MARK_TYPE, data: { className } }));
                char = char.merge({ marks });
                characters = characters.set(i, char);
            }
        }

        function processToken(token, accu) {
            accu = accu || '';

            if (typeof token === 'string') {
                if (accu) {
                    addMark(offset, offset + token.length, 'prism-token token ' + accu);
                }
                offset += token.length;
            }

            else {
                accu = accu + ' ' + token.type + ' ' + (token.alias || '');

                if (typeof token.content === 'string') {
                    addMark(offset, offset + token.content.length, 'prism-token token ' + accu);
                    offset += token.content.length;
                }

                // When using token.content instead of token.matchedStr, token can be deep
                else {
                    for (var i =0; i < token.content.length; i++) {
                        processToken(token.content[i], accu);
                    }
                }
            }
        }

        for (var i =0; i < tokens.length; i++) {
            processToken(tokens[i]);
        }

        return characters.asImmutable();
    }

    return {
        schema: {
            rules: [
                {
                    match: opts.onlyIn,
                    decorate
                },
                {
                    match: (object) => {
                        return (object.kind === 'mark' && object.type === MARK_TYPE);
                    },
                    render: opts.renderToken
                }
            ]
        }
    };
}

module.exports = PrismPlugin;
