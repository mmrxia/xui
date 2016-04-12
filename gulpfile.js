/*
 * gulp 打包
 * */

var gulp = require('gulp'), //删除清空文件夹
    gutil = require('gulp-util'),
    del = require('del'),  //删除清空文件夹
    rename = require('gulp-rename'),    //重命名
    concat = require('gulp-concat'),    //合并
    jshint = require('gulp-jshint'),    //js校验
    uglify = require('gulp-uglify'),    //js压缩
    minifyCss = require('gulp-minify-css'),     //css压缩
    revAppend = require('gulp-rev-append'),  //用于生成版本号
    rev = require('gulp-rev'),  //用于生成版本号
    revCollector = require('gulp-rev-collector');     //gulp-rev的插件，用户更改html引用路径

// Task: js concat and uglify
gulp.task('js', function () {
    return gulp.src(['./examples/js/*.js'])
        .pipe(concat('xui.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./dist'));
});

// Task: css concat and uglify
gulp.task('css', function () {
    return gulp.src(['./examples/css/*.css'])
        .pipe(concat('xui.css'))
        .pipe(uglify())
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


