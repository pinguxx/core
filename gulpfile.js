/**
 * gulpfile.js
 * for integration with rollup / riot
 */
var gulp = require('gulp');
var webserver = require('gulp-webserver');
var shell = require('gulp-shell');
/**
 * start of tasks
 */
gulp.task('serve', function () {
    var dir = './dist';
    return gulp.src(dir).pipe(webserver({
        livereload: true,
        open: true
    }));
});
gulp.task('copy', function () {
    //gulp.src('./components/index.html').pipe(gulp.dest('./dest'));
    return gulp.src('./index.html').pipe(gulp.dest('./dist'));
});
gulp.task('rollup', ['copy'], shell.task([
	'rollup -c'
]));
gulp.task('watch', function () {
    gulp.watch(['./index.html', './src/**/*.html', './src/**/*.js', './src/**/*.css'], ['rollup']);
});
/**
 * default task - call gulp and its done
 */
gulp.task('default', ['watch', 'serve', 'copy', 'rollup']);