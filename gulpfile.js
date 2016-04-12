/*
 * gulp 打包
 * */

var gulp = require('gulp'),
    gutil = require('gulp-util'),
    del = require('del'),  //删除清空文件夹
    rename = require('gulp-rename'),    //重命名
    concat = require('gulp-concat'),    //合并
    jshint = require('gulp-jshint'),    //js校验
    uglify = require('gulp-uglify'),    //js压缩
    minifyCss = require('gulp-minify-css');     //css压缩

// Task: js concat and uglify
gulp.task('js', function () {
    return gulp.src(['./examples/js/*.js'])
        .pipe(concat('xui.js', {newLine: ';'}))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

// Task: css concat and uglify
gulp.task('css', function () {
    return gulp.src(['./examples/css/ui.css', './examples/css/*.css'])
        .pipe(concat('xui.css'))
        .pipe(rename({suffix: '.min'}))
        .pipe(minifyCss())
        .pipe(gulp.dest('./dist'));
});


// Clean
gulp.task('clean', function () {
    return del(['./dist/']);
});

gulp.task('build', ['clean'], function () {
    gutil.log(gutil.colors.red('start build'));
    gulp.start('js', 'css');
});

// Default task
gulp.task('default', ['build']);


