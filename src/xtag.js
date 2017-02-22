import '../lib/DOMTokenList.js';
import '../lib/webcomponents.js';
import '../lib/pep.js';

import Accessors from './accessors';
import DOM from './DOM';
import Events from './events';
import Mixins from './mixins';
import Pseudos from './pseudos';
import Repository from './repository';
import Utils from './utilities';

export default class XTag {
    constructor() {
        this.accessor = new Accessors(this);
        this.dom = new DOM(this);
        this.event = new Events(this);
        this.pseudo = new Pseudos(this);
        this.mixin = new Mixins(this);
        this.repository = Repository;
        this.utils = new Utils(this);
        this.defaultOptions = {
            pseudos: [],
            mymixins: [],
            events: {},
            methods: {},
            accessors: {},
            lifecycle: {},
            attributes: {},
            'prototype': {
                xtag: {
                    get: function () {
                        return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = {
                            data: {}
                        });
                    }
                }
            }
        }
        console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(this)));
        if (this.name) {
            this.register(this.name, this);
        }
    }
    register(name, options) {
        let xtag = this.repository.tags[name];
        if (!xtag) {
            if (options instanceof XTag) {
                xtag = options;
            } else {
                xtag = new XTag();
            }
        } else {
            return xtag;
        }
        return xtag._register(name, options);
    }
    _register(name, options) {
        var _name,
            curTag = this;
        if (typeof name == 'string') _name = name.toLowerCase();
        else throw 'First argument must be a Custom Element string name';
        //console.log(this, this.repository)
        this.repository.tags[_name] = options || {};

        var basePrototype = options.prototype;
        delete options.prototype;
        var tag = this.repository.tags[_name].compiled = this.mixin.applyMixins(this.utils.merge({}, this.defaultOptions, options));
        var proto = tag.prototype || Object.getPrototypeOf(tag);
        var lifecycle = tag.lifecycle;

        for (var z in tag.events) tag.events[z] = this.event.parseEvent(z, tag.events[z]);
        for (z in lifecycle) lifecycle[z.split(':')[0]] = this.pseudo.applyPseudos(z, lifecycle[z], tag.pseudos, lifecycle[z]);
        for (z in tag.methods) proto[z.split(':')[0]] = {
            value: this.pseudo.applyPseudos(z, tag.methods[z], tag.pseudos, tag.methods[z]),
            enumerable: true
        };
        for (z in tag.accessors) this.accessor.parseAccessor(tag, z);

        //if (tag.shadow) tag.shadow = tag.shadow.nodeName ? tag.shadow : this.dom.createFragment(tag.shadow);
        if (tag.content) tag.content = tag.content.nodeName ? tag.content.innerHTML : this.dom.parseMultiline(tag.content);
        var created = lifecycle.created;
        var finalized = lifecycle.finalized;
        proto.createdCallback = {
            enumerable: true,
            value: function () {
                var element = this;
                //if (tag.shadow && this.dom.hasShadow) this.createShadowRoot().appendChild(tag.shadow.cloneNode(true));
                if (tag.content) this.appendChild(document.createElement('div')).outerHTML = tag.content;
                var output = created ? created.apply(this, arguments) : null;
                curTag.event.addEvents(this, tag.events);
                for (var name in tag.attributes) {
                    var attr = tag.attributes[name],
                        hasAttr = this.hasAttribute(name),
                        hasDefault = attr.def !== undefined;
                    if (hasAttr || attr.boolean || hasDefault) {
                        this[attr.key] = attr.boolean ? hasAttr : !hasAttr && hasDefault ? attr.def : this.getAttribute(name);
                    }
                }
                tag.pseudos.forEach(function (obj) {
                    obj.onAdd.call(element, obj);
                });
                this.xtagComponentReady = true;
                if (finalized) finalized.apply(this, arguments);
                return output;
            }
        };

        var inserted = lifecycle.inserted;
        var removed = lifecycle.removed;
        if (inserted || removed) {
            proto.attachedCallback = {
                value: function () {
                    if (removed) this.xtag.__parentNode__ = this.parentNode;
                    if (inserted) return inserted.apply(this, arguments);
                },
                enumerable: true
            };
        }
        if (removed) {
            proto.detachedCallback = {
                value: function () {
                    var args = curTag.utils.toArray(arguments);
                    args.unshift(this.xtag.__parentNode__);
                    var output = removed.apply(this, args);
                    delete this.xtag.__parentNode__;
                    return output;
                },
                enumerable: true
            };
        }
        if (lifecycle.attributeChanged) proto.attributeChangedCallback = {
            value: lifecycle.attributeChanged,
            enumerable: true
        };

        proto.setAttribute = {
            writable: true,
            enumerable: true,
            value: function (name, value) {
                var old;
                var _name = name.toLowerCase();
                var attr = tag.attributes[_name];
                if (attr) {
                    old = this.getAttribute(_name);
                    value = attr.boolean ? '' : attr.validate ? attr.validate.call(this, value) : value;
                }
                curTag.accessor.modAttr(this, attr, _name, value, 'setAttribute');
                if (attr) {
                    if (attr.setter) attr.setter.call(this, attr.boolean ? true : value, old);
                    curTag.accessor.syncAttr(this, attr, _name, value, 'setAttribute');
                }
            }
        };

        proto.removeAttribute = {
            writable: true,
            enumerable: true,
            value: function (name) {
                var _name = name.toLowerCase();
                var attr = tag.attributes[_name];
                var old = this.hasAttribute(_name);
                curTag.accessor.modAttr(this, attr, _name, '', 'removeAttribute');
                if (attr) {
                    if (attr.setter) attr.setter.call(this, attr.boolean ? false : undefined, old);
                    curTag.accessor.syncAttr(this, attr, _name, '', 'removeAttribute');
                }
            }
        };

        var definition = {};
        var instance = basePrototype instanceof window.HTMLElement;
        var extended = tag['extends'] && (definition['extends'] = tag['extends']);

        if (basePrototype) Object.getOwnPropertyNames(basePrototype).forEach(function (z) {
            var prop = proto[z];
            var desc = instance ? Object.getOwnPropertyDescriptor(basePrototype, z) : basePrototype[z];
            if (prop) {
                for (var y in desc) {
                    if (typeof desc[y] == 'function' && prop[y]) prop[y] = curTag.utils.wrap(desc[y], prop[y]);
                    else prop[y] = desc[y];
                }
            }
            proto[z] = prop || desc;
        });

        definition['prototype'] = Object.create(
            extended ? Object.create(document.createElement(extended).constructor).prototype : window.HTMLElement.prototype,
            proto
        );

        return document.registerElement(_name, definition);
    }
    //exposed functions
    createFragment(content) {
        return this.dom.createFragment(content);
    }
    set(element, method, value) {
        this.dom.set(element, method, value);
    }
    innerHTML(el, html) {
        this.dom.innerHTML(el, html);
    }
    fireEvent(element, type, options) {
        this.event.fireEvent(element, type, options);
    }
    get mixins() {
        return this.repository.mixins;
    }
    get pseudos() {
        return this.repository.pseudos;
    }
    query(element, selector) {
        return this.dom.query(element, selector);
    }
    hasClass(element, klass) {
        return this.dom.hasClass(element, klass);
    }
    addClass(element, klass) {
        return this.dom.addClass(element, klass);
    }
    removeClass(element, klass) {
        return this.dom.removeClass(element, klass);
    }
    toggleClass(element, klass) {
        return this.dom.toggleClass(element, klass);
    }
    typeOf(obj) {
        return this.utils.typeOf(obj);
    }
    toArray(obj) {
        return this.utils.toArray(obj);
    }
    queryChildren(element, selector) {
        return this.dom.queryChildren(element, selector);
    }
    wrap(original, fn) {
        return this.utils.wrap(original, fn);
    }
    uid() {
        return this.dom.uid();
    }
    addEvent(element, type, fn, capture) {
        return this.event.addEvent(element, type, fn, capture);
    }
    skipFrame(fn) {
        return this.dom.skipFrame(fn);
    }
    removeEvent(element, type, event) {
        return this.event.removeEvent(element, type, event);
    }
}

window.xtag = new XTag();

export let xtag = window.xtag;

document.addEventListener('WebComponentsReady', function () {
    window.xtag.fireEvent(document.body, 'DOMComponentsLoaded');
});
//console.log(window.xtag);