export default class Clone {
    static object(src, utils) {
        const obj = {};
        for (let key in src) {
            obj[key] = utils.clone(src[key], utils)
        }
        return obj;
    }
    static array(src, utils) {
        let i = src.length;
        const array = new Array(i);
        while (i--) {
            array[i] = utils.clone(src[i], utils);
        }
        return array;
    }
}