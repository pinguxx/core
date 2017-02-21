import XTag, {
    xtag
} from './xtag';
import './transitions';

export default class Child extends XTag {
    get name() {
        return 'x-notify';
    }
    get lifecycle() {
        return {
            inserted: function () {
                this.parentNode.setAttribute('x-notify-parentnode', '');
            },
            removed: function (parent) {
                if (!xtag.queryChildren(parent, 'x-notify')[0]) parent.removeAttribute('x-notify-parentnode');
            }
        }
    }
    get methods() {
        return {
            'show:transition': function () {
                if (!this.showing) this.showing = true;
                clearTimeout(this.xtag.timer);
                if (this.duration) {
                    var node = this;
                    this.xtag.timer = setTimeout(function () {
                        node.hide()
                    }, this.duration);
                }
            },
            'hide:transition': function () {
                clearTimeout(this.xtag.timer);
                if (this.showing) this.showing = false;
            }
        }
    }
    get events() {
        return {
            'tap:delegate([closable])': function (e) {
                if (e.target == e.currentTarget) e.currentTarget.hide();
            }
        }
    }
    get accessors() {
        return {
            showing: {
                attribute: {
                    boolean: true
                },
                set: function (val /*, old*/ ) {
                    val ? this.show() : this.hide();
                }
            },
            duration: {
                attribute: {
                    validate: function (val) {
                        return val || 3000;
                    }
                }
            }
        }
    }
}

let child = new Child();
console.log(xtag.pseudos);