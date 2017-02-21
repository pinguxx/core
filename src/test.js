import XTag from './xtag'

export default class Child extends XTag {
    get name() {
        return 'o-child';
    }
    get lifecycle() {
        return {
            created: function () {
                this.start();
            }
        }
    }
    get methods() {
        return {
            start: function () {
                this.update();
                this.xtagObj.interval = setInterval(this.update.bind(this), 1000);
            },
            stop: function () {
                this.xtagObj.interval = clearInterval(this.xtagObj.interval);
            },
            update: function () {
                this.textContent = new Date().toLocaleTimeString();
            }
        }
    }
    get events() {
        return {
            tap: function () {
                if (this.xtagObj.interval) this.stop();
                else this.start();
            }
        }
    }
}

let child = new Child();
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(child)));