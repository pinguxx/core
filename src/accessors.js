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
            acc = this;
        if (type == 'get') {
            key[0] = prop;
            tag.prototype[prop].get = this.xtag.pseudo.applyPseudos(key.join(':'), accessor[z], tag.pseudos, accessor[z]);
        } else if (type == 'set') {
            key[0] = prop;
            tag.prototype[prop].set = this.xtag.pseudo.applyPseudos(key.join(':'), attr ? function (value) {
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
            tag.prototype[prop][z] = accessor[z];
        }
    }

    parseAccessor(tag, prop) {
        var accessor = tag.accessors[prop],
            attr = accessor.attribute,
            name,
            acc = this;
        tag.prototype[prop] = {};

        if (attr) {
            name = attr.name = (attr ? (attr.name || prop.replace(this.regexCamelToDash, '$1-$2')) : prop).toLowerCase();
            attr.key = prop;
            tag.attributes[name] = attr;
        }

        for (var z in accessor) {
            this.attachProperties(tag, prop, z, accessor, attr, name);
        }

        if (attr) {
            if (!tag.prototype[prop].get) {
                var method = (attr.boolean ? 'has' : 'get') + 'Attribute';
                tag.prototype[prop].get = function () {
                    return this[method](name);
                };
            }
            if (!tag.prototype[prop].set) tag.prototype[prop].set = function (value) {
                value = attr.boolean ? !!value : attr.validate ? attr.validate.call(this, value) : value;
                var method = attr.boolean ? (value ? 'setAttribute' : 'removeAttribute') : 'setAttribute';
                acc.modAttr(this, attr, name, value, method);
                acc.syncAttr(this, attr, name, value, method);
            };
        }
    }

}