/**
 * rollup.config.js
 */
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import npm from 'rollup-plugin-node-resolve';

export default {
    entry: 'src/test.js',
    dest: 'dist/x-tag.js',
    format: 'umd',
    //sourceMap: true,
    moduleName: 'Xtag',
    plugins: [
		npm({
            jsnext: true,
            main: true,
            browser: true
        }),
		commonjs(),
		babel()
	]
}