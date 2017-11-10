const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpSequence = require('gulp-sequence');
const gulpUglify = require('gulp-uglify');
const gulpConcat = require('gulp-concat');
const gulpCleanCSS = require('gulp-clean-css');
const gulpEslint = require('gulp-eslint');
const gulpRename = require('gulp-rename');
const gulpHeader = require('gulp-header');
const babel = require('rollup-plugin-babel');
const eslint = require('rollup-plugin-eslint');
const pkg = require('../package.json');
const walkByRollup = require('./rollupbuild').walk;

const banner = ['/*!',
    ' * <%= pkg.name %> v<%= pkg.version %>',
    ' * (c) 2017-<%= date %> <%= pkg.author %>',
    ' * Released under the <%= pkg.license %> License.',
    ' * <%= pkg.homepage %>',
    ' */',
    '',
].join('\n').replace(/<%=\s([^%]+)\s%>/g, ($0, $1) => ($1 === 'date' ? new Date().getFullYear() : (pkg[$1.split('.')[1]] || '')));

const RELEASE_ROOT_PATH = 'dist';
const SOURCE_ROOT_PATH = 'src';
const isSourceMap = false;

function resolvePath(p) {
    return path.resolve(__dirname, '../', p);
}

if (!fs.existsSync(resolvePath(RELEASE_ROOT_PATH))) {
    fs.mkdirSync(resolvePath(RELEASE_ROOT_PATH));
}

gulp.task('build_main', () => walkByRollup([{
    input: resolvePath(`${SOURCE_ROOT_PATH}/index.js`),
    plugins: [
        eslint({
            exclude: 'node_modules/**',
        }),
        babel({
            exclude: 'node_modules/**',
        }),
    ],
    output: {
        file: resolvePath(`${RELEASE_ROOT_PATH}/image-process.js`),
    },
    format: 'umd',
    name: 'ImageProcess',
    banner,
    sourcemap: isSourceMap,
}]));

gulp.task('build_clip', () => walkByRollup([{
    input: resolvePath(`${SOURCE_ROOT_PATH}/clip/index.js`),
    plugins: [
        eslint({
            exclude: 'node_modules/**',
        }),
        babel({
            exclude: 'node_modules/**',
        }),
    ],
    output: {
        file: resolvePath(`${RELEASE_ROOT_PATH}/image-clip.js`),
    },
    format: 'umd',
    name: 'ImageClip',
    banner,
    sourcemap: isSourceMap,
}]));

// eslint代码检查打包文件以外的文件
gulp.task('eslint_others', () => gulp.src([
    resolvePath('build/**/*.js'),
    resolvePath('test/**/*.js'),
    // 主动ignore
    `!${resolvePath('test/inner/promise.js')}`,
])
    .pipe(gulpEslint())
    .pipe(gulpEslint.format()));
// 开启后如果报错会退出
// .pipe(gulpEslint.failAfterError());

gulp.task('concat_css', () => gulp.src([
    resolvePath(`${SOURCE_ROOT_PATH}/css/*.css`),
])
    .pipe(gulpConcat('image-process.css'))
    .pipe(gulp.dest(resolvePath(RELEASE_ROOT_PATH))));

gulp.task('concat_css_clip', () => gulp.src([
    resolvePath(`${SOURCE_ROOT_PATH}/clip/css/*.css`),
])
    .pipe(gulpConcat('image-clip.css'))
    .pipe(gulp.dest(resolvePath(RELEASE_ROOT_PATH))));

gulp.task('build', ['build_main', 'build_clip', 'concat_css', 'concat_css_clip', 'eslint_others']);

gulp.task('dist_js_uglify', () => gulp.src([
    resolvePath(`${RELEASE_ROOT_PATH}/**/*.js`),
    '!PATH'.replace('PATH', resolvePath(`${RELEASE_ROOT_PATH}/**/*.min.js`)),
])
    .pipe(gulpUglify())
    .on('error', (err) => {
        console.log('line number: %d, message: %s', err.lineNumber, err.message);
        this.end();
    })
    .pipe(gulpRename({
        suffix: '.min',
    }))
    .pipe(gulpHeader(banner))
    .pipe(gulp.dest(resolvePath(RELEASE_ROOT_PATH))));

// 压缩core css
gulp.task('clean_css', () => gulp.src([
    resolvePath(`${RELEASE_ROOT_PATH}/**/*.css`),
    '!PATH'.replace('PATH', resolvePath(`${RELEASE_ROOT_PATH}/**/*.min.css`)),
])
    .pipe(gulpCleanCSS())
    .pipe(gulpRename({
        suffix: '.min',
    }))
    .pipe(gulp.dest(resolvePath(RELEASE_ROOT_PATH))));

gulp.task('dist', ['dist_js_uglify', 'clean_css']);

gulp.task('default', (callback) => {
    gulpSequence('build', 'dist')(callback);
});

gulp.task('watch', () => {
    gulp.watch([
        resolvePath(`${SOURCE_ROOT_PATH}/**/*.js`),
        resolvePath(`${SOURCE_ROOT_PATH}/**/*.css`),
        resolvePath('build/**/*.js'),
        resolvePath('test/**/*.js'),
    ], ['default']);
});