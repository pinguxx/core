export default class Pseudos {
    constructor(xtag) {
        this.xtag = xtag;
        this.regexDigits = /(\d+)/g;
        this.regexPseudoParens = /\(|\)/g;
        this.regexPseudoCapture = /:(\w+)\u276A(.+?(?=\u276B))|:(\w+)/g;
        this.keypseudo = {
            action: function (pseudo, event) {
                return pseudo.value.match(this.regexDigits).indexOf(String(event.keyCode)) > -1 == (pseudo.name == 'keypass') || null;
            }
        };
        this.pseudos = {
            __mixin__: {},
            mixins: {
                onCompiled: function (fn, pseudo) {
                    var mixin = pseudo.source && pseudo.source.__mixin__ || pseudo.source;
                    if (mixin) switch (pseudo.value) {
                        case null: case '': case 'before': return function () {
                            mixin.apply(this, arguments);
                            return fn.apply(this, arguments);
                        };
                        case 'after': return function () {
                            var returns = fn.apply(this, arguments);
                            mixin.apply(this, arguments);
                            return returns;
                        };
                        case 'none': return fn;
                    }
                    else return fn;
                }
            },
            keypass: this.keypseudo,
            keyfail: this.keypseudo,
            delegate: {
                action: this.xtag.event.delegateAction
            },
            preventable: {
                action: function (pseudo, event) {
                    return !event.defaultPrevented;
                }
            },
            duration: {
                onAdd: function (pseudo) {
                    pseudo.source.duration = Number(pseudo.value);
                }
            },
            capture: {
                onCompiled: function (fn, pseudo) {
                    if (pseudo.source) pseudo.source.capture = true;
                }
            }
        };
    }

    parsePseudo(fn) { fn(); }

    applyPseudos(key, fn, target, source) {
        var listener = fn,
            pseudos = {},
            pseudoObj = this;
        if (key.match(':')) {
            var matches = [],
                valueFlag = 0;
            key.replace(this.regexPseudoParens, function (match) {
                if (match == '(') return ++valueFlag == 1 ? '\u276A' : '(';
                return !--valueFlag ? '\u276B' : ')';
            }).replace(this.regexPseudoCapture, function (z, name, value, solo) {
                matches.push([name || solo, value]);
            });
            var i = matches.length;
            while (i--) this.parsePseudo(() => {
                var name = matches[i][0],
                    value = matches[i][1];
                if (!this.pseudos[name] && !pseudoObj.xtag.pseudos[name]) throw "pseudo not found: " + name + " " + value;
                value = (value === '' || typeof value == 'undefined') ? null : value;
                var pseudo = pseudos[i] = Object.create(this.pseudos[name] || pseudoObj.xtag.pseudos[name]);
                pseudo.key = key;
                pseudo.name = name;
                pseudo.value = value;
                pseudo['arguments'] = (value || '').split(',');
                pseudo.action = pseudo.action || this.xtag.utils.trueop;
                pseudo.source = source;
                pseudo.onAdd = pseudo.onAdd || this.xtag.utils.noop;
                pseudo.onRemove = pseudo.onRemove || this.xtag.utils.noop;
                var original = pseudo.listener = listener;
                listener = function () {
                    var output = pseudo.action.apply(this, [pseudo].concat(pseudoObj.xtag.utils.toArray(arguments)));
                    if (output === null || output === false) return output;
                    output = pseudo.listener.apply(this, arguments);
                    pseudo.listener = original;
                    return output;
                };
                if (!target) pseudo.onAdd.call(fn, pseudo);
                else target.push(pseudo);
            });
        }
        for (var z in pseudos) {
            if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]) || listener;
        }
        return listener;
    }

    removePseudos(target, pseudos) {
        pseudos.forEach(function (obj) {
            obj.onRemove.call(target, obj);
        });
    }
}