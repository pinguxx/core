const prefix = function prefix() {
    const keys = Object.keys(window).join(),
        pre = ((keys.match(/,(ms)/) || keys.match(/,(moz)/) || keys.match(/,(O)/)) || [null, 'webkit'])[1].toLowerCase();
    return {
        dom: pre == 'ms' ? 'MS' : pre,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre == 'ms' ? pre : pre.charAt(0).toUpperCase() + pre.substring(1)
    };
}

const mSelector = Element.prototype.matches || Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];

export default class Dom {
    constructor(xtag) {
        this.xtag = xtag;
        this.container = document.createElement('div');
        this.regexReplaceCommas = /,/g;
        this.unwrapComment = /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)\s*\*\//;
        this.win = window;
        this.hasShadow = Element.prototype.createShadowRoot
        this.prefix = prefix;
        this.mSelector = mSelector;
    }
    parseMultiline(fn) {
        return typeof fn == 'function' ? this.unwrapComment.exec(fn.toString())[1] : fn;
    }
    /*
      ----- This should be simplified! -----
      Generates a random ID string
    */
    uid() {
        return Math.random().toString(36).substr(2, 10);
    }
    query(element, selector) {
        return (selector || '').length ? this.xtag.utils.toArray(element.querySelectorAll(selector)) : [];
    }

    skipTransition(element, fn, bind) {
        const prop = this.prefix.js + 'TransitionProperty',
            callback = fn ? fn.call(bind || element) : null;
        element.style[prop] = element.style.transitionProperty = 'none';
        return this.skipFrame(() => {
            element.style[prop] = element.style.transitionProperty = '';
            if (callback) {
                callback.call(bind || element);
            }
        });
    }

    requestFrame() {
        const raf = this.win.requestAnimationFrame ||
            this.win[this.prefix.lowercase + 'RequestAnimationFrame'] ||
            function (fn) { return this.win.setTimeout(fn, 20); };
        return function (fn) { return raf(fn); };
    }

    cancelFrame() {
        const cancel = this.win.cancelAnimationFrame ||
            this.win[this.prefix.lowercase + 'CancelAnimationFrame'] ||
            this.win.clearTimeout;
        return function (id) { return cancel(id); };
    }

    skipFrame(fn) {
        let id = this.requestFrame(() => {
            id = this.requestFrame(fn);
        });
        return id;
    }

    static matchSelector(element, selector) {
        return mSelector.call(element, selector);
    }

    set(element, method, value) {
        element[method] = value;
        if (this.win.CustomElements) {
            this.win.CustomElements.upgradeAll(element);
        }
    }

    innerHTML(el, html) {
        this.set(el, 'innerHTML', html);
    }

    hasClass(element, klass) {
        return element.className.split(' ').indexOf(klass.trim()) > -1;
    }

    addClass(element, klass) {
        const list = element.className.trim().split(' ');
        klass.trim().split(' ').forEach((name) => {
            if (!~list.indexOf(name)) {
                list.push(name);
            }
        });
        element.className = list.join(' ').trim();
        return element;
    }

    removeClass(element, klass) {
        const classes = klass.trim().split(' ');
        element.className = element.className.trim().split(' ').filter((name) => {
            return name && !~classes.indexOf(name);
        }).join(' ');
        return element;
    }

    toggleClass(element, klass) {
        return this[this.hasClass(element, klass) ? 'removeClass' : 'addClass'].call(null, element, klass);
    }
    /*
      Runs a query on only the children of an element
    */
    queryChildren(element, selector) {
        const id = element.id,
            attr = '#' + (element.id = id || 'x_' + this.uid()) + ' > ',
            parent = element.parentNode || !this.container.appendChild(element)
        let result;
        selector = attr + (selector + '').replace(this.regexReplaceCommas, ',' + attr);
        result = element.parentNode.querySelectorAll(selector);
        if (!id) {
            element.removeAttribute('id');
        }
        if (!parent) {
            this.container.removeChild(element);
        }
        return this.xtag.utils.toArray(result);
    }
    /*
      Creates a document fragment with the content passed in - content can be
      a string of HTML, an element, or an array/collection of elements
    */
    createFragment(content) {
        const template = document.createElement('template');
        if (content) {
            if (content.nodeName) this.xtag.utils.toArray(arguments).forEach(function (e) {
                template.content.appendChild(e);
            });
            else template.innerHTML = this.parseMultiline(content);
        }
        return document.importNode(template.content, true);
    }
    /*
      Removes an element from the DOM for more performant node manipulation. The element
      is placed back into the DOM at the place it was taken from.
    */
    manipulate(element, fn) {
        const next = element.nextSibling,
            parent = element.parentNode,
            returned = fn.call(element) || element;
        if (next) {
            parent.insertBefore(returned, next);
        } else {
            parent.appendChild(returned);
        }
    }
}