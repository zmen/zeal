var gulp = require('gulp');
var jasmine = require('gulp-jasmine');

gulp.task("spec", function () {
    console.log("SPEC task running");
    gulp.src('test/**/*.js')
        .pipe(jasmine());
});

gulp.task('testparse', function () {
    gulp.src('test/parse_spec.js')
    .pipe(jasmine());
});