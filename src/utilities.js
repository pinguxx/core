import Clone from './clone.js';

/*
    This is an enhanced typeof check for all types of objects. Where typeof would normaly return
    'object' for many common DOM objects (like NodeLists and HTMLCollections).
    - For example: typeOf(document.children) will correctly return 'htmlcollection'
*/

export default class Utilities {
    constructor(xtag) {
        this.xtag = xtag;
        this.typeCache = {};
        this.typeString = this.typeCache.toString;
        this.typeRegexp = /\s([a-zA-Z]+)/;
        this.unsliceable = { 'undefined': 1, 'null': 1, 'number': 1, 'boolean': 1, 'string': 1, 'function': 1 };
    }
    noop() { }
    trueop() {
        return true;
    }
    typeOf(obj) {
        const type = this.typeString.call(obj);
        return this.typeCache[type] || (this.typeCache[type] = type.match(this.typeRegexp)[1].toLowerCase());
    }
    clone(item, type) {
        const fn = Clone[type || this.typeOf(item), this];
        return fn ? fn(item) : item;
    }
    /*
     The toArray() method allows for conversion of any object to a true array. For types that
     cannot be converted to an array, the method returns a 1 item array containing the passed-in object.
    */
    toArray(obj) {
        return this.unsliceable[this.typeOf(obj)] ? [obj] : Array.prototype.slice.call(obj, 0);
    }
    wrap(original, fn) {
        return function () {
            const output = original.apply(this, arguments);
            fn.apply(this, arguments);
            return output;
        };
    }
    /*
      Recursively merges one object with another. The first argument is the destination object,
      all other objects passed in as arguments are merged from right to left, conflicts are overwritten
    */
    merge(source, k, v) {
        const argLength = arguments.length;
        if (this.typeOf(k) == 'string') {
            return this.mergeOne(source, k, v);
        }
        for (let i = 1, l = argLength; i < l; i++) {
            let object = arguments[i];
            if (object instanceof this.xtag.constructor) {
                for (let key of Object.getOwnPropertyNames(Object.getPrototypeOf(object))) {
                    this.mergeOne(source, key, object[key]);
                }
            } else {
                for (let key in object) {
                    this.mergeOne(source, key, object[key]);
                }
            }
        }
        return source;
    }

    mergeOne(source, key, current) {
        var type = this.typeOf(current);
        if (type == 'object' && this.typeOf(source[key]) == 'object') {
            this.merge(source[key], current);
        } else {
            source[key] = this.clone(current, type);
        }
        return source;
    }

}