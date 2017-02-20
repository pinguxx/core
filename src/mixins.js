export default class Mixins {
    constructor(xtag) {
        this.xtag = xtag;
        this.uniqueMixinCount = 0;
    }
    mergeMixin(tag, original, mixin) {
        let key, z;
        const keys = {};
        for (z in original) {
            keys[z.split(':')[0]] = z;
        }
        for (z in mixin) {
            key = keys[z.split(':')[0]];
            if (typeof original[key] == 'function') {
                if (!key.match(':mixins')) {
                    original[key + ':mixins'] = original[key];
                    delete original[key];
                    key = key + ':mixins';
                }
                original[key].__mixin__ = this.xtag.pseudos.applyPseudos(z + (z.match(':mixins') ? '' : ':mixins'), mixin[z], tag.pseudos, original[key].__mixin__);
            }
            else {
                original[z] = mixin[z];
                delete original[key];
            }
        }
    }

    addMixin(tag, original, mixin) {
        for (let z in mixin) {
            original[z + ':__mixin__(' + (this.uniqueMixinCount++) + ')'] = this.xtag.pseudos.applyPseudos(z, mixin[z], tag.pseudos);
        }
    }

    resolveMixins(mixins, output) {
        let index = mixins.length;
        while (index--) {
            output.unshift(mixins[index]);
            if (this.xtag.mixins[mixins[index]] && this.xtag.mixins[mixins[index]].mixins) {
                this.resolveMixins(this.xtag.mixins[mixins[index]].mixins, output);
            }
        }
        return output;
    }

    applyMixins(tag) {
        this.resolveMixins(tag.mixins, []).forEach((name) => {
            const mixin = this.xtag.mixins[name];
            for (let type in mixin) {
                const item = mixin[type],
                    original = tag[type];
                if (!original) {
                    tag[type] = item;
                } else {
                    switch (type) {
                        case 'mixins': break;
                        case 'events': this.addMixin(tag, original, item); break;
                        case 'accessors':
                        case 'prototype':
                            for (let z in item) {
                                if (!original[z]) {
                                    original[z] = item[z];
                                } else {
                                    this.mergeMixin(tag, original[z], item[z], name);
                                }
                            }
                            break;
                        default: this.mergeMixin(tag, original, item, name);
                    }
                }
            }
        });
        return tag;
    }
}