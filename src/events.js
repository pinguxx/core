import DOM from './DOM'

export default class Events {
    constructor(xtag) {
        this.xtag = xtag;
        this.skipProps = {};
        this.captureEvents = { focus: 1, blur: 1, scroll: 1, DOMMouseScroll: 1 };
        this.customEvents = {
            animationstart: {
                attach: [xtag.dom.prefix.dom + 'AnimationStart']
            },
            animationend: {
                attach: [xtag.dom.prefix.dom + 'AnimationEnd']
            },
            transitionend: {
                attach: [xtag.dom.prefix.dom + 'TransitionEnd']
            },
            move: {
                attach: ['pointermove']
            },
            enter: {
                attach: ['pointerenter']
            },
            leave: {
                attach: ['pointerleave']
            },
            scrollwheel: {
                attach: ['DOMMouseScroll', 'mousewheel'],
                condition: function (event) {
                    event.delta = event.wheelDelta ? event.wheelDelta / 40 : Math.round(event.detail / 3.5 * -1);
                    return true;
                }
            },
            tap: {
                attach: ['pointerdown', 'pointerup'],
                condition: function (event, custom) {
                    if (event.type == 'pointerdown') {
                        custom.startX = event.clientX;
                        custom.startY = event.clientY;
                    }
                    else if (event.button === 0 &&
                        Math.abs(custom.startX - event.clientX) < 10 &&
                        Math.abs(custom.startY - event.clientY) < 10) return true;
                }
            },
            tapstart: {
                attach: ['pointerdown'],
                condition: this.touchFilter
            },
            tapend: {
                attach: ['pointerup'],
                condition: this.touchFilter
            },
            tapmove: {
                attach: ['pointerdown'],
                condition: function (event, custom) {
                    if (event.type == 'pointerdown') {
                        var listener = custom.listener.bind(this);
                        if (!custom.tapmoveListeners) custom.tapmoveListeners = this.addEvents(document, {
                            pointermove: listener,
                            pointerup: listener,
                            pointercancel: listener
                        });
                    }
                    else if (event.type == 'pointerup' || event.type == 'pointercancel') {
                        this.removeEvents(document, custom.tapmoveListeners);
                        custom.tapmoveListeners = null;
                    }
                    return true;
                }
            },
            taphold: {
                attach: ['pointerdown', 'pointerup'],
                condition: function (event, custom) {
                    if (event.type == 'pointerdown') {
                        (custom.pointers = custom.pointers || {})[event.pointerId] = setTimeout(
                            this.fireEvent.bind(null, this, 'taphold'),
                            custom.duration || 1000
                        );
                    }
                    else if (event.type == 'pointerup') {
                        if (custom.pointers) {
                            clearTimeout(custom.pointers[event.pointerId]);
                            delete custom.pointers[event.pointerId];
                        }
                    }
                    else return true;
                }
            }
        };
        for (let z in document.createEvent('CustomEvent')) {
            this.skipProps[z] = 1;
        }
    }
    inheritEvent(event, base) {
        const desc = Object.getOwnPropertyDescriptor(event, 'target');
        for (let z in base) {
            if (!this.skipProps[z]) {
                this.writeProperty(z, event, base, desc);
            }
        }
        event.baseEvent = base;
    }
    delegateAction(pseudo, event) {
        var match,
            target = event.target,
            root = event.currentTarget;
        while (!match && target && target != root) {
            if (target.tagName && DOM.matchSelector(target, pseudo.value)) match = target;
            target = target.parentNode;
        }
        if (!match && root.tagName && DOM.matchSelector(root, pseudo.value)) match = root;
        return match ? pseudo.listener = pseudo.listener.bind(match) : null;
    }

    touchFilter(event) {
        return event.button === 0;
    }

    writeProperty(key, event, base, desc) {
        if (desc) event[key] = base[key];
        else Object.defineProperty(event, key, {
            writable: true,
            enumerable: true,
            value: base[key]
        });
    }


    parseEvent(type, fn) {
        var pseudos = type.split(':'),
            key = pseudos.shift(),
            custom = this.customEvents[key],
            event = this.xtag.utils.merge({
                type: key,
                stack: this.xtag.utils.noop,
                condition: this.xtag.utils.trueop,
                capture: this.captureEvents[key],
                attach: [],
                _attach: [],
                pseudos: '',
                _pseudos: [],
                onAdd: this.xtag.utils.noop,
                onRemove: this.xtag.utils.noop
            }, custom || {});
        event.attach = this.xtag.utils.toArray(event.base || event.attach);
        event.chain = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
        var stack = this.xtag.pseudo.applyPseudos(event.chain, fn, event._pseudos, event);
        event.stack = function (e) {
            //e.currentTarget = e.currentTarget || this;
            var detail = e.detail || {};
            if (!detail.__stack__) {
                return stack.apply(this, arguments);
            } else if (detail.__stack__ == stack) {
                e.stopPropagation();
                e.cancelBubble = true;
                return stack.apply(this, arguments);
            }
        };
        event.listener = function (e) {
            var args = this.xtag.utils.toArray(arguments),
                output = event.condition.apply(this, args.concat([event]));
            if (!output) return output;
            // The second condition in this IF is to address the following Blink regression: https://code.google.com/p/chromium/issues/detail?id=367537
            // Remove this when affected browser builds with this regression fall below 5% marketshare
            if (e.type != key && (e.baseEvent && e.type != e.baseEvent.type)) {
                this.fireEvent(e.target, key, {
                    baseEvent: e,
                    detail: output !== true && (output.__stack__ = stack) ? output : { __stack__: stack }
                });
            }
            else return event.stack.apply(this, args);
        };
        event.attach.forEach((name) => {
            event._attach.push(this.parseEvent(name, event.listener));
        });
        return event;
    }

    addEvent(element, type, fn, capture) {
        var event = typeof fn == 'function' ? this.parseEvent(type, fn) : fn;
        event._pseudos.forEach(function (obj) {
            obj.onAdd.call(element, obj);
        });
        event._attach.forEach((obj) => {
            this.addEvent(element, obj.type, obj);
        });
        event.onAdd.call(element, event, event.listener);
        element.addEventListener(event.type, event.stack, capture || event.capture);
        return event;
    }

    addEvents(element, obj) {
        var events = {};
        for (var z in obj) {
            events[z] = this.addEvent(element, z, obj[z]);
        }
        return events;
    }

    removeEvent(element, type, event) {
        event = event || type;
        event.onRemove.call(element, event, event.listener);
        this.xtag.pseudo.removePseudos(element, event._pseudos);
        event._attach.forEach((obj) => {
            this.removeEvent(element, obj);
        });
        element.removeEventListener(event.type, event.stack);
    }

    removeEvents(element, obj) {
        for (var z in obj) this.removeEvent(element, obj[z]);
    }

    fireEvent(element, type, options) {
        var event = document.createEvent('CustomEvent');
        options = options || {};
        event.initCustomEvent(type,
            options.bubbles !== false,
            options.cancelable !== false,
            options.detail
        );
        if (options.baseEvent) this.inheritEvent(event, options.baseEvent);
        element.dispatchEvent(event);
    }

}