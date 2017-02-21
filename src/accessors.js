export default class Accessors {
    constructor(xtag) {
        this.attrProto = {
            setAttribute: Element.prototype.setAttribute,
            removeAttribute: Element.prototype.removeAttribute
        };
        this.regexCamelToDash = /([a-z])([A-Z])/g;
        this.xtag = xtag;
    }
    modAttr(element, attr, name, value, method) {
        this.attrProto[method].call(element, name, attr && attr.boolean ? '' : value);
    }

    syncAttr(element, attr, name, value, method) {
        if (attr && (attr.property || attr.selector)) {
            let nodes = (attr.property ? [element.xtag[attr.property]] : (attr.selector ? this.xtag.dom.query(element, attr.selector) : [])),
                index = nodes.length;
            while (index--) {
                nodes[index][method](name, value);
            }
        }
    }

    attachProperties(tag, prop, z, accessor, attr, name) {
        const key = z.split(':'),
            type = key[0],
            acc = this,
            proto = tag.prototype || Object.getPrototypeOf(tag);
        if (type == 'get') {
            key[0] = prop;
            proto[prop].get = this.xtag.pseudo.applyPseudos(key.join(':'), accessor[z], tag.pseudos, accessor[z]);
        } else if (type == 'set') {
            key[0] = prop;
            proto[prop].set = this.xtag.pseudo.applyPseudos(key.join(':'), attr ? function (value) {
                var old, method = 'setAttribute';
                if (attr.boolean) {
                    value = !!value;
                    old = this.hasAttribute(name);
                    if (!value) method = 'removeAttribute';
                }
                else {
                    value = attr.validate ? attr.validate.call(this, value) : value;
                    old = this.getAttribute(name);
                }
                acc.modAttr(this, attr, name, value, method);
                accessor[z].call(this, value, old);
                acc.syncAttr(this, attr, name, value, method);
            } : accessor[z] ? function (value) {
                accessor[z].call(this, value);
            } : null, tag.pseudos, accessor[z]);

            if (attr) {
                attr.setter = accessor[z];
            }
        } else {
            proto[prop][z] = accessor[z];
        }
    }

    parseAccessor(tag, prop) {
        var accessor = tag.accessors[prop],
            attr = accessor.attribute,
            name,
            acc = this,
            proto = tag.prototype || Object.getPrototypeOf(tag);
        proto[prop] = {};

        if (attr) {
            name = attr.name = (attr ? (attr.name || prop.replace(this.regexCamelToDash, '$1-$2')) : prop).toLowerCase();
            attr.key = prop;
            tag.attributes[name] = attr;
        }

        for (var z in accessor) {
            this.attachProperties(tag, prop, z, accessor, attr, name);
        }

        if (attr) {
            if (!proto[prop].get) {
                var method = (attr.boolean ? 'has' : 'get') + 'Attribute';
                proto[prop].get = function () {
                    return this[method](name);
                };
            }
            if (!proto[prop].set) proto[prop].set = function (value) {
                value = attr.boolean ? !!value : attr.validate ? attr.validate.call(this, value) : value;
                var method = attr.boolean ? (value ? 'setAttribute' : 'removeAttribute') : 'setAttribute';
                acc.modAttr(this, attr, name, value, method);
                acc.syncAttr(this, attr, name, value, method);
            };
        }
    }

}