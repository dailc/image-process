/*!
 * image-process v0.0.1
 * (c) 2017-2017 dailc
 * Released under the MIT License.
 * https://github.com/dailc/image-process
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ImageProcess = factory());
}(this, (function () { 'use strict';

/**
 * 缩放算法
 * 最临邻近插值
 */

function scale(data, width, height, newData, newWidth, newHeight) {
    // 计算压缩后的缩放比
    var scaleW = newWidth / width;
    var scaleH = newHeight / height;
    var dstData = newData;

    var filter = function filter(dstCol, dstRow) {
        var srcCol = Math.min(width - 1, dstCol / scaleW);
        var srcRow = Math.min(height - 1, dstRow / scaleH);
        var intCol = Math.floor(srcCol);
        var intRow = Math.floor(srcRow);

        // 真实的index，因为数组是一维的
        var dstI = dstRow * newWidth + dstCol;
        var srcI = intRow * width + intCol;

        // rgba，所以要乘以4
        dstI *= 4;
        srcI *= 4;

        for (var j = 0; j <= 3; j += 1) {
            dstData[dstI + j] = data[srcI + j];
        }
    };

    // 区块
    for (var col = 0; col < newWidth; col += 1) {
        for (var row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

function nearestNeighborInterpolation(imgData, newImgData) {
    scale(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

    return newImgData;
}

/**
 * 缩放算法
 * 双线性差值，会损坏原图（带低通滤波器效果）
 */

/**
 * 获取某行某列的像素对于的rgba值
 * @param {Object} data 图像数据
 * @param {Number} srcWidth 宽度
 * @param {Number} srcHeight 高度
 * @param {Number} row 目标像素的行
 * @param {Number} col 目标像素的列
 */
function getRGBAValue(data, srcWidth, srcHeight, row, col) {
    var newRow = row;
    var newCol = col;

    if (newRow >= srcHeight) {
        newRow = srcHeight - 1;
    } else if (newRow < 0) {
        newRow = 0;
    }

    if (newCol >= srcWidth) {
        newCol = srcWidth - 1;
    } else if (newCol < 0) {
        newCol = 0;
    }

    var newIndex = newRow * srcWidth + newCol;

    newIndex *= 4;

    return [data[newIndex + 0], data[newIndex + 1], data[newIndex + 2], data[newIndex + 3]];
}

function scale$1(data, width, height, newData, newWidth, newHeight) {
    // 计算压缩后的缩放比
    var scaleW = newWidth / width;
    var scaleH = newHeight / height;
    var dstData = newData;

    var filter = function filter(dstCol, dstRow) {
        // 源图像中的坐标（可能是一个浮点）
        var srcCol = Math.min(width - 1, dstCol / scaleW);
        var srcRow = Math.min(height - 1, dstRow / scaleH);
        var intCol = Math.floor(srcCol);
        var intRow = Math.floor(srcRow);
        // 计算u和v
        var u = srcCol - intCol;
        var v = srcRow - intRow;
        // 1-u与1-v
        var u1 = 1 - u;
        var v1 = 1 - v;

        // 真实的index，因为数组是一维的
        var dstI = dstRow * newWidth + dstCol;

        // rgba，所以要乘以4
        dstI *= 4;

        var rgba00 = getRGBAValue(data, width, height, intRow + 0, intCol + 0);
        var rgba01 = getRGBAValue(data, width, height, intRow + 0, intCol + 1);
        var rgba10 = getRGBAValue(data, width, height, intRow + 1, intCol + 0);
        var rgba11 = getRGBAValue(data, width, height, intRow + 1, intCol + 1);

        for (var j = 0; j <= 3; j += 1) {
            var partV = v * (u1 * rgba10[j] + u * rgba11[j]);
            var partV1 = v1 * (u1 * rgba00[j] + u * rgba01[j]);

            dstData[dstI + j] = partV + partV1;
        }
    };

    for (var col = 0; col < newWidth; col += 1) {
        for (var row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

function bilinearInterpolation(imgData, newImgData) {
    scale$1(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

    return newImgData;
}

/**
 * 缩放算法
 * 双立方（三次）卷积插值，图像更真实
 * 计算周围16个点
 * 取一阶导数值为二阶差分值的情况，满足插值函数一阶导函数连续
 * 函数逼近程度和三次样条插值效果一样，非常的高
 *
 * 公式：（矩阵乘法）
 * 推导公式
 * http://blog.csdn.net/qq_24451605/article/details/49474113
 * https://en.wikipedia.org/wiki/Bicubic_interpolation
 * */
var a00 = void 0;
var a01 = void 0;
var a02 = void 0;
var a03 = void 0;
var a10 = void 0;
var a11 = void 0;
var a12 = void 0;
var a13 = void 0;
var a20 = void 0;
var a21 = void 0;
var a22 = void 0;
var a23 = void 0;
var a30 = void 0;
var a31 = void 0;
var a32 = void 0;
var a33 = void 0;

var getRGBAValue$1 = function getRGBAValue(data, srcWidth, srcHeight, row, col, colorIndex) {
    var newRow = row;
    var newCol = col;

    if (newRow >= srcHeight) {
        newRow = srcHeight - 1;
    } else if (newRow < 0) {
        newRow = 0;
    }

    if (newCol >= srcWidth) {
        newCol = srcWidth - 1;
    } else if (newCol < 0) {
        newCol = 0;
    }

    var newIndex = newRow * srcWidth + newCol;

    newIndex *= 4;

    return data[newIndex + colorIndex];
};

var getPixelValue = function getPixelValue(pixelValue) {
    var newPixelValue = pixelValue;

    newPixelValue = Math.min(255, newPixelValue);
    newPixelValue = Math.max(0, newPixelValue);

    return newPixelValue;
};

var updateCoefficients = function updateCoefficients(tmpPixels) {
    var p = tmpPixels;

    a00 = p[1][1];
    a01 = -0.5 * p[1][0] + 0.5 * p[1][2];
    a02 = p[1][0] - 2.5 * p[1][1] + 2 * p[1][2] - 0.5 * p[1][3];
    a03 = -0.5 * p[1][0] + 1.5 * p[1][1] - 1.5 * p[1][2] + 0.5 * p[1][3];

    a10 = -0.5 * p[0][1] + 0.5 * p[2][1];
    a11 = 0.25 * p[0][0] - 0.25 * p[0][2] - 0.25 * p[2][0] + 0.25 * p[2][2];
    a12 = -0.5 * p[0][0] + 1.25 * p[0][1] - p[0][2] + 0.25 * p[0][3] + 0.5 * p[2][0] - 1.25 * p[2][1] + p[2][2] - 0.25 * p[2][3];
    a13 = 0.25 * p[0][0] - 0.75 * p[0][1] + 0.75 * p[0][2] - 0.25 * p[0][3] - 0.25 * p[2][0] + 0.75 * p[2][1] - 0.75 * p[2][2] + 0.25 * p[2][3];

    a20 = p[0][1] - 2.5 * p[1][1] + 2 * p[2][1] - 0.5 * p[3][1];
    a21 = -0.5 * p[0][0] + 0.5 * p[0][2] + 1.25 * p[1][0] - 1.25 * p[1][2] - p[2][0] + p[2][2] + 0.25 * p[3][0] - 0.25 * p[3][2];
    a22 = p[0][0] - 2.5 * p[0][1] + 2 * p[0][2] - 0.5 * p[0][3] - 2.5 * p[1][0] + 6.25 * p[1][1] - 5 * p[1][2] + 1.25 * p[1][3] + 2 * p[2][0] - 5 * p[2][1] + 4 * p[2][2] - p[2][3] - 0.5 * p[3][0] + 1.25 * p[3][1] - p[3][2] + 0.25 * p[3][3];
    a23 = -0.5 * p[0][0] + 1.5 * p[0][1] - 1.5 * p[0][2] + 0.5 * p[0][3] + 1.25 * p[1][0] - 3.75 * p[1][1] + 3.75 * p[1][2] - 1.25 * p[1][3] - p[2][0] + 3 * p[2][1] - 3 * p[2][2] + p[2][3] + 0.25 * p[3][0] - 0.75 * p[3][1] + 0.75 * p[3][2] - 0.25 * p[3][3];

    a30 = -0.5 * p[0][1] + 1.5 * p[1][1] - 1.5 * p[2][1] + 0.5 * p[3][1];
    a31 = 0.25 * p[0][0] - 0.25 * p[0][2] - 0.75 * p[1][0] + 0.75 * p[1][2] + 0.75 * p[2][0] - 0.75 * p[2][2] - 0.25 * p[3][0] + 0.25 * p[3][2];
    a32 = -0.5 * p[0][0] + 1.25 * p[0][1] - p[0][2] + 0.25 * p[0][3] + 1.5 * p[1][0] - 3.75 * p[1][1] + 3 * p[1][2] - 0.75 * p[1][3] - 1.5 * p[2][0] + 3.75 * p[2][1] - 3 * p[2][2] + 0.75 * p[2][3] + 0.5 * p[3][0] - 1.25 * p[3][1] + p[3][2] - 0.25 * p[3][3];
    a33 = 0.25 * p[0][0] - 0.75 * p[0][1] + 0.75 * p[0][2] - 0.25 * p[0][3] - 0.75 * p[1][0] + 2.25 * p[1][1] - 2.25 * p[1][2] + 0.75 * p[1][3] + 0.75 * p[2][0] - 2.25 * p[2][1] + 2.25 * p[2][2] - 0.75 * p[2][3] - 0.25 * p[3][0] + 0.75 * p[3][1] - 0.75 * p[3][2] + 0.25 * p[3][3];
};

var getValue = function getValue(x, y) {
    var x2 = x * x;
    var x3 = x2 * x;
    var y2 = y * y;
    var y3 = y2 * y;

    return a00 + a01 * y + a02 * y2 + a03 * y3 + (a10 + a11 * y + a12 * y2 + a13 * y3) * x + (a20 + a21 * y + a22 * y2 + a23 * y3) * x2 + (a30 + a31 * y + a32 * y2 + a33 * y3) * x3;
};

function scale$2(data, width, height, newData, newWidth, newHeight) {
    var dstData = newData;

    // 计算压缩后的缩放比
    var scaleW = newWidth / width;
    var scaleH = newHeight / height;

    var filter = function filter(dstCol, dstRow) {
        // 源图像中的坐标（可能是一个浮点）
        var srcCol = Math.min(width - 1, dstCol / scaleW);
        var srcRow = Math.min(height - 1, dstRow / scaleH);
        var intCol = Math.floor(srcCol);
        var intRow = Math.floor(srcRow);
        // 计算u和v
        var u = srcCol - intCol;
        var v = srcRow - intRow;

        // 真实的index，因为数组是一维的
        var dstI = dstRow * newWidth + dstCol;

        dstI *= 4;

        // 16个邻近像素的灰度（分别计算成rgba）
        var tmpPixels = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
        // rgba
        for (var i = 0; i <= 3; i += 1) {
            // 16个临近点
            for (var m = -1; m <= 2; m += 1) {
                for (var n = -1; n <= 2; n += 1) {
                    tmpPixels[m + 1][n + 1] = getRGBAValue$1(data, width, height, intRow + m, intCol + n, i);
                }
            }

            // 更新系数
            updateCoefficients(tmpPixels);
            // 利用uv来求值
            dstData[dstI + i] = getPixelValue(getValue(v, u));
        }
    };

    // 区块
    for (var col = 0; col < newWidth; col += 1) {
        for (var row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

function bicubicInterpolation(imgData, newImgData) {
    scale$2(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

    return newImgData;
}

/**
 * 缩放算法
 * 双立方（三次）卷积插值，图像更真实
 * 计算周围16个点
 * 取一阶导数值为二阶差分值的情况，满足插值函数一阶导函数连续
 * 函数逼近程度和三次样条插值效果一样，非常的高
 *
 * 公式：（矩阵乘法）
 * 推导公式
 * http://blog.csdn.net/qq_24451605/article/details/49474113
 * https://en.wikipedia.org/wiki/Bicubic_interpolation
 * */

/**
 * 采样公式的常数A取值,调整锐化与模糊
 * -0.5 三次Hermite样条
 * -0.75 常用值之一
 * -1 逼近y = sin(x*PI)/(x*PI)
 * -2 常用值之一
 */
var A = -1;

function interpolationCalculate(x) {
    var absX = x >= 0 ? x : -x;
    var x2 = x * x;
    var x3 = absX * x2;

    if (absX <= 1) {
        return 1 - (A + 3) * x2 + (A + 2) * x3;
    } else if (absX <= 2) {
        return -4 * A + 8 * A * absX - 5 * A * x2 + A * x3;
    }

    return 0;
}

function getPixelValue$1(pixelValue) {
    var newPixelValue = pixelValue;

    newPixelValue = Math.min(255, newPixelValue);
    newPixelValue = Math.max(0, newPixelValue);

    return newPixelValue;
}

/**
 * 获取某行某列的像素对于的rgba值
 * @param {Object} data 图像数据
 * @param {Number} srcWidth 宽度
 * @param {Number} srcHeight 高度
 * @param {Number} row 目标像素的行
 * @param {Number} col 目标像素的列
 */
function getRGBAValue$2(data, srcWidth, srcHeight, row, col) {
    var newRow = row;
    var newCol = col;

    if (newRow >= srcHeight) {
        newRow = srcHeight - 1;
    } else if (newRow < 0) {
        newRow = 0;
    }

    if (newCol >= srcWidth) {
        newCol = srcWidth - 1;
    } else if (newCol < 0) {
        newCol = 0;
    }

    var newIndex = newRow * srcWidth + newCol;

    newIndex *= 4;

    return [data[newIndex + 0], data[newIndex + 1], data[newIndex + 2], data[newIndex + 3]];
}

function scale$3(data, width, height, newData, newWidth, newHeight) {
    var dstData = newData;

    // 计算压缩后的缩放比
    var scaleW = newWidth / width;
    var scaleH = newHeight / height;

    var filter = function filter(dstCol, dstRow) {
        // 源图像中的坐标（可能是一个浮点）
        var srcCol = Math.min(width - 1, dstCol / scaleW);
        var srcRow = Math.min(height - 1, dstRow / scaleH);
        var intCol = Math.floor(srcCol);
        var intRow = Math.floor(srcRow);
        // 计算u和v
        var u = srcCol - intCol;
        var v = srcRow - intRow;

        // 真实的index，因为数组是一维的
        var dstI = dstRow * newWidth + dstCol;

        dstI *= 4;

        // 存储灰度值的权重卷积和
        var rgbaData = [0, 0, 0, 0];
        // 根据数学推导，16个点的f1*f2加起来是趋近于1的（可能会有浮点误差）
        // 因此就不再单独先加权值，再除了
        // 16个邻近点
        for (var m = -1; m <= 2; m += 1) {
            for (var n = -1; n <= 2; n += 1) {
                var rgba = getRGBAValue$2(data, width, height, intRow + m, intCol + n);
                // 一定要正确区分 m,n和u,v对应的关系，否则会造成图像严重偏差（譬如出现噪点等）
                // F(row + m, col + n)S(m - v)S(n - u)
                var f1 = interpolationCalculate(m - v);
                var f2 = interpolationCalculate(n - u);
                var weight = f1 * f2;

                rgbaData[0] += rgba[0] * weight;
                rgbaData[1] += rgba[1] * weight;
                rgbaData[2] += rgba[2] * weight;
                rgbaData[3] += rgba[3] * weight;
            }
        }

        dstData[dstI + 0] = getPixelValue$1(rgbaData[0]);
        dstData[dstI + 1] = getPixelValue$1(rgbaData[1]);
        dstData[dstI + 2] = getPixelValue$1(rgbaData[2]);
        dstData[dstI + 3] = getPixelValue$1(rgbaData[3]);
    };

    // 区块
    for (var col = 0; col < newWidth; col += 1) {
        for (var row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

function bicubicInterpolation$1(imgData, newImgData) {
    scale$3(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

    return newImgData;
}

function extend(target) {
    var finalTarget = target;

    for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        rest[_key - 1] = arguments[_key];
    }

    rest.forEach(function (source) {
        source && Object.keys(source).forEach(function (key) {
            finalTarget[key] = source[key];
        });
    });

    return finalTarget;
}

/**
 * 选择这段代码用到的太多了，因此抽取封装出来
 * @param {Object} element dom元素或者selector
 * @return {HTMLElement} 返回选择的Dom对象，无果没有符合要求的，则返回null
 */
function selector(element) {
    var target = element;

    if (typeof target === 'string') {
        target = document.querySelector(target);
    }

    return target;
}

/**
 * 获取DOM的可视区高度，兼容PC上的body高度获取
 * 因为在通过body获取时，在PC上会有CSS1Compat形式，所以需要兼容
 * @param {HTMLElement} dom 需要获取可视区高度的dom,对body对象有特殊的兼容方案
 * @return {Number} 返回最终的高度
 */


/**
 * 设置一个Util对象下的命名空间
 * @param {Object} parent 需要绑定到哪一个对象上
 * @param {String} namespace 需要绑定的命名空间名
 * @param {Object} target 需要绑定的目标对象
 * @return {Object} 返回最终的对象
 */

var defaultArgs = {
    width: 80,
    height: 80,
    mime: 'image/png',
    // 0: nearestNeighbor
    // 1: bilinearInterpolation
    // 2: bicubicInterpolation
    processType: 0
};

function scaleMixin(ImageProcess) {
    var api = ImageProcess;

    /**
     * 对img对象进行缩放，返回一个base64字符串
     * @param {Image} image 目标image
     * @return {String} 返回目标图片的b64字符串
     */
    api.scaleImage = function scaleImage(image, args) {
        var width = image.width;
        var height = image.height;
        var finalArgs = extend({}, defaultArgs, args);
        var processTypes = [nearestNeighborInterpolation, bilinearInterpolation, bicubicInterpolation, bicubicInterpolation$1];

        var canvasTransfer = document.createElement('canvas');
        var ctxTransfer = canvasTransfer.getContext('2d');

        canvasTransfer.width = width;
        canvasTransfer.height = height;

        ctxTransfer.drawImage(image, 0, 0, width, height);

        var imageData = ctxTransfer.getImageData(0, 0, width, height);
        var newImageData = ctxTransfer.createImageData(finalArgs.width, finalArgs.height);

        newImageData = processTypes[finalArgs.processType](imageData, newImageData, finalArgs);

        canvasTransfer.width = newImageData.width;
        canvasTransfer.height = newImageData.height;

        ctxTransfer.putImageData(newImageData, 0, 0, 0, 0, canvasTransfer.width, canvasTransfer.height);

        console.log(imageData);
        console.log(newImageData);
        // console.log('压缩时w:' + canvasTransfer.width + ',' + canvasTransfer.height);

        return canvasTransfer.toDataURL(finalArgs.mime, 0.9);
    };
}

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultetting = {
    container: '#imgclip',
    // 必须是一个image对象
    img: null,
    // 压缩质量
    quality: 0.92,
    isConstrain: true,
    // 是否开启平滑
    isSmooth: true,
    // 放大镜捕获的图像半径
    captureRadius: 30,
    mime: 'image/jpeg'
};
var domChildren = [];
var events = {};

var ImgClip = function () {
    /**
     * 构造函数
     * @param {Object} options 配置信息
     * @constructor
     */
    function ImgClip(options) {
        _classCallCheck(this, ImgClip);

        this.options = extend({}, defaultetting, options);
        this.container = selector(this.options.container);

        this.clear();

        this.img = this.options.img;

        this.initCanvas();
        this.initClip();
        this.initMagnifier();
        this.initTransferCanvas();
        this.clipRectReset();
    }

    /**
     * 获取devicePixelRatio(像素比)
     * canvas绘制时乘以缩放系数，防止裁剪不清晰
     * （譬如320的手机上可能裁剪出来的就是640-系数是2）
     */


    _createClass(ImgClip, [{
        key: 'clear',
        value: function clear() {
            for (var i = 0; i < domChildren.length; i += 1) {
                this.container.removeChild(domChildren[i]);
            }
            domChildren = [];

            var allEventNames = Object.keys(events);

            for (var _i = 0; _i < allEventNames.length; _i += 1) {
                this.container.removeEventListener(allEventNames[_i], events[allEventNames[_i]]);
            }
            events = {};
        }
    }, {
        key: 'initCanvas',
        value: function initCanvas() {
            this.canvasFull = document.createElement('canvas');
            this.ctxFull = this.canvasFull.getContext('2d');
            this.smoothCtx(this.ctxFull);

            // 实际的像素比，绘制时基于这个比例绘制
            this.RATIO_PIXEL = ImgClip.getPixelRatio(this.ctxFull);
            // 获取图片的宽高比
            var wPerH = this.img.width / this.img.height;
            var oldWidth = this.container.offsetWidth || window.innerWidth;

            this.oldWidth = oldWidth;
            this.oldHeight = oldWidth / wPerH;
            this.resizeCanvas(oldWidth, this.oldHeight);
            this.container.appendChild(this.canvasFull);
            domChildren.push(this.canvasFull);
        }
    }, {
        key: 'resizeCanvas',
        value: function resizeCanvas(width, height) {
            var wPerH = width / height;
            var legalWidth = this.oldWidth;
            var legalHeight = legalWidth / wPerH;

            this.canvasFull.style.width = legalWidth + 'px';
            this.canvasFull.style.height = legalHeight + 'px';
            this.canvasFull.width = legalWidth * this.RATIO_PIXEL;
            this.canvasFull.height = legalHeight * this.RATIO_PIXEL;

            if (this.rotateStep & 1) {
                this.scale = this.canvasFull.width / this.img.height;
            } else {
                this.scale = this.canvasFull.width / this.img.width;
            }
        }
    }, {
        key: 'initClip',
        value: function initClip() {
            var clipRect = document.createElement('div');

            clipRect.className = 'clip-rect';

            this.clipRect = clipRect;
            this.container.appendChild(this.clipRect);
            domChildren.push(this.clipRect);

            // 添加tips
            var clipTips = document.createElement('span');

            clipTips.className = 'clip-tips';
            this.clipRect.appendChild(clipTips);
            this.clipTips = clipTips;

            this.clipRectHorns = [];
            // 添加8个角
            for (var i = 0; i < 8; i += 1) {
                var spanHorn = document.createElement('span');

                spanHorn.className = 'clip-rect-horn ';

                if (i === 0) {
                    spanHorn.className += 'horn-nw';
                } else if (i === 1) {
                    spanHorn.className += 'horn-ne';
                } else if (i === 2) {
                    spanHorn.className += 'horn-sw';
                } else if (i === 3) {
                    spanHorn.className += 'horn-se';
                } else if (i === 4) {
                    spanHorn.className += 'horn-n';
                } else if (i === 5) {
                    spanHorn.className += 'horn-s';
                } else if (i === 6) {
                    spanHorn.className += 'horn-w';
                } else if (i === 7) {
                    spanHorn.className += 'horn-e';
                }
                this.clipRect.appendChild(spanHorn);
                this.clipRectHorns.push(spanHorn);
            }

            this.clipEventState = {};
            this.resizeClip();
        }
    }, {
        key: 'resizeClip',
        value: function resizeClip() {
            var _this = this;

            var startResize = function startResize(e) {
                _this.canResizing = true;
                _this.saveEventState(e);
                _this.canvasMag.classList.remove('clip-hidden');
            };
            var endResize = function endResize() {
                _this.canResizing = false;
                _this.canvasMag.classList.add('clip-hidden');
            };

            for (var i = 0; i < 8; i += 1) {
                this.clipRectHorns[i].addEventListener('mousedown', startResize);
                this.clipRectHorns[i].addEventListener('touchstart', startResize);

                this.clipRectHorns[i].addEventListener('mouseup', endResize);
                this.clipRectHorns[i].addEventListener('touchend', endResize);
            }

            this.container.addEventListener('mouseleave', endResize);
            this.container.addEventListener('mouseup', endResize);
            events.mouseleave = endResize;
            events.mouseup = endResize;

            var moving = function moving(e) {
                if (!_this.canResizing) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                // 区分pageX与clientX
                var mouseY = e.touches ? e.touches[0].pageY : e.pageY;
                var mouseX = e.touches ? e.touches[0].pageX : e.pageX;
                var curY = mouseY - _this.container.offsetTop;
                var curX = mouseX - _this.container.offsetLeft;

                var clipEventState = _this.clipEventState;
                var target = clipEventState.evnt.target;
                var isConstrain = _this.options.isConstrain;

                if (isConstrain) {
                    curY = Math.min(curY, _this.container.offsetHeight);
                    curY = Math.max(0, curY);
                    curX = Math.min(curX, _this.container.offsetWidth);
                    curX = Math.max(0, curX);
                }

                _this.curX = curX;
                _this.curY = curY;

                var width = void 0;
                var height = void 0;
                var left = void 0;
                var top = void 0;

                if (target.classList.contains('horn-nw')) {
                    width = clipEventState.width - (curX - clipEventState.left);
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = curX;
                    top = curY;
                } else if (target.classList.contains('horn-ne')) {
                    width = curX - clipEventState.left;
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = clipEventState.left;
                    top = curY;
                } else if (target.classList.contains('horn-sw')) {
                    width = clipEventState.width - (curX - clipEventState.left);
                    height = curY - clipEventState.top;
                    left = curX;
                    top = clipEventState.top;
                } else if (target.classList.contains('horn-se')) {
                    width = curX - clipEventState.left;
                    height = curY - clipEventState.top;
                    left = clipEventState.left;
                    top = clipEventState.top;
                } else if (target.classList.contains('horn-n')) {
                    width = clipEventState.width;
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = clipEventState.left;
                    top = curY;
                } else if (target.classList.contains('horn-s')) {
                    width = clipEventState.width;
                    height = curY - clipEventState.top;
                    left = clipEventState.left;
                    top = clipEventState.top;
                } else if (target.classList.contains('horn-w')) {
                    width = clipEventState.width - (curX - clipEventState.left);
                    height = clipEventState.height;
                    left = curX;
                    top = clipEventState.top;
                } else if (target.classList.contains('horn-e')) {
                    width = curX - clipEventState.left;
                    height = clipEventState.height;
                    left = curX - width;
                    top = clipEventState.top;
                }
                _this.rectOldLeft = left;
                _this.rectOldTop = top;
                _this.rectOldWidth = width;
                _this.rectOldHeight = height;
                _this.clipRect.style.left = left + 'px';
                _this.clipRect.style.top = top + 'px';
                _this.clipRect.style.width = width + 'px';
                _this.clipRect.style.height = height + 'px';
                _this.draw();
            };

            this.container.addEventListener('touchmove', moving);
            this.container.addEventListener('mousemove', moving);

            events.touchmove = moving;
            events.mousemove = moving;
        }
    }, {
        key: 'saveEventState',
        value: function saveEventState(e) {
            this.clipEventState.width = this.clipRect.offsetWidth;
            this.clipEventState.height = this.clipRect.offsetHeight;
            this.clipEventState.left = this.clipRect.offsetLeft;
            this.clipEventState.top = this.clipRect.offsetTop;
            this.clipEventState.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
            this.clipEventState.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
            this.clipEventState.evnt = e;
        }
    }, {
        key: 'draw',
        value: function draw() {
            // 放大镜
            this.drawMag();
            var realImgSize = this.getRealFinalImgSize(this.clipRect.offsetWidth * this.RATIO_PIXEL, this.clipRect.offsetHeight * this.RATIO_PIXEL);
            var curWidth = realImgSize.width;
            var curHeight = realImgSize.height;
            // clipTips,canvas之外的
            this.clipTips.innerText = curWidth.toFixed(0) + '*' + curHeight.toFixed(0);

            this.ctxFull.save();
            if (this.rotateStep & 1) {
                this.ctxFull.clearRect(0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.clearRect(0, 0, this.canvasFull.width, this.canvasFull.height);
            }

            this.drawImage();
            this.drawMask();

            this.ctxFull.beginPath();

            var params = this.getClipRectParams();
            var srcX = params.srcX;
            var srcY = params.srcY;
            var sWidth = params.sWidth;
            var sHeight = params.sHeight;

            this.ctxFull.rect(srcX, srcY, sWidth, sHeight);
            this.ctxFull.clip();
            this.drawImage();
            this.ctxFull.restore();
        }
    }, {
        key: 'getClipRectParams',
        value: function getClipRectParams() {
            var srcX = this.clipRect.offsetLeft;
            var srcY = this.clipRect.offsetTop;
            var sWidth = this.clipRect.offsetWidth;
            var sHeight = this.clipRect.offsetHeight;

            var offsetTop = this.clipRect.offsetTop;
            var offsetLeft = this.clipRect.offsetLeft;
            var offsetWidth = this.clipRect.offsetWidth;
            var offsetHeight = this.clipRect.offsetHeight;
            var offsetRight = offsetLeft + offsetWidth;
            var offsetBottom = offsetTop + offsetHeight;

            if (this.rotateStep === 1) {
                srcX = offsetTop;
                srcY = this.container.offsetWidth - offsetRight;
                sWidth = offsetHeight;
                sHeight = offsetWidth;
            } else if (this.rotateStep === 2) {
                srcX = this.container.offsetWidth - offsetRight;
                srcY = this.container.offsetHeight - offsetBottom;
                sWidth = offsetWidth;
                sHeight = offsetHeight;
            } else if (this.rotateStep === 3) {
                srcX = this.container.offsetHeight - offsetBottom;
                srcY = offsetLeft;
                sWidth = offsetHeight;
                sHeight = offsetWidth;
            }

            srcX *= this.RATIO_PIXEL;
            srcY *= this.RATIO_PIXEL;
            sWidth *= this.RATIO_PIXEL;
            sHeight *= this.RATIO_PIXEL;

            return {
                srcX: srcX,
                srcY: srcY,
                sWidth: sWidth,
                sHeight: sHeight
            };
        }
    }, {
        key: 'getRealCoordinate',
        value: function getRealCoordinate(mouseX, mouseY) {
            // 获取真实坐标系（旋转缩放后的）
            var x = mouseX;
            var y = mouseY;

            if (this.rotateStep === 1) {
                x = mouseY;
                y = this.container.offsetWidth - mouseX;
            } else if (this.rotateStep === 2) {
                x = this.container.offsetWidth - mouseX;
                y = this.container.offsetHeight - mouseY;
            } else if (this.rotateStep === 3) {
                x = this.container.offsetHeight - mouseY;
                y = mouseX;
            }

            x *= this.RATIO_PIXEL;
            y *= this.RATIO_PIXEL;

            return {
                x: x,
                y: y
            };
        }
    }, {
        key: 'drawImage',
        value: function drawImage() {
            // 宽高在旋转不同的情况下是颠倒的
            if (this.rotateStep & 1) {
                this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height, 0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height, 0, 0, this.canvasFull.width, this.canvasFull.height);
            }
        }
    }, {
        key: 'drawMask',
        value: function drawMask() {
            this.ctxFull.save();

            this.ctxFull.fillStyle = 'rgba(0, 0, 0, 0.3)';
            if (this.rotateStep & 1) {
                this.ctxFull.fillRect(0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.fillRect(0, 0, this.canvasFull.width, this.canvasFull.height);
            }

            this.ctxFull.restore();
        }
    }, {
        key: 'drawMag',
        value: function drawMag() {
            var captureRadius = this.options.captureRadius;
            var centerPoint = this.getRealCoordinate(this.curX, this.curY);
            var srcX = centerPoint.x - captureRadius;
            var srcY = centerPoint.y - captureRadius;
            var sWidth = captureRadius * 2;
            var sHeight = captureRadius * 2;

            if (this.rotateStep & 1) {
                this.ctxMag.clearRect(0, 0, this.canvasMag.height, this.canvasMag.width);
            } else {
                this.ctxMag.clearRect(0, 0, this.canvasMag.width, this.canvasMag.height);
            }

            // 生成新的图片,内部坐标会使用原图片的尺寸
            this.ctxMag.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, 0, 0, this.canvasMag.width, this.canvasMag.height);

            var centerX = this.canvasMag.width / 2;
            var centerY = this.canvasMag.height / 2;
            var radius = 5 * this.RATIO_PIXEL;

            // 绘制十字校准
            this.ctxMag.beginPath();
            this.ctxMag.moveTo(centerX - radius, centerY);
            this.ctxMag.lineTo(centerX + radius, centerY);
            this.ctxMag.moveTo(centerX, centerY - radius);
            this.ctxMag.lineTo(centerX, centerY + radius);
            this.ctxMag.strokeStyle = '#de3c50';
            this.ctxMag.lineWidth = 3;
            this.ctxMag.stroke();
        }
    }, {
        key: 'initMagnifier',
        value: function initMagnifier() {
            this.canvasMag = document.createElement('canvas');
            this.canvasMag.className = 'magnifier clip-hidden';
            this.ctxMag = this.canvasMag.getContext('2d');
            this.smoothCtx(this.ctxMag);
            this.container.appendChild(this.canvasMag);
            domChildren.push(this.canvasMag);

            // 需要初始化一个高度，否则如果旋转时会造不对
            // 捕获直径*像素比
            this.canvasMag.width = this.options.captureRadius * 2 * this.RATIO_PIXEL;
            this.canvasMag.height = this.options.captureRadius * 2 * this.RATIO_PIXEL;
        }
    }, {
        key: 'initTransferCanvas',
        value: function initTransferCanvas() {
            this.canvasTransfer = document.createElement('canvas');
            this.canvasTransfer.style.display = 'none';
            this.canvasTransfer.className = 'transfer-canvas';
            this.ctxTransfer = this.canvasTransfer.getContext('2d');
            this.smoothCtx(this.ctxTransfer);
            this.container.appendChild(this.canvasTransfer);
            domChildren.push(this.canvasTransfer);
        }
    }, {
        key: 'smoothCtx',
        value: function smoothCtx(ctx) {
            var isSmooth = this.options.isSmooth;

            ctx.mozImageSmoothingEnabled = isSmooth;
            ctx.webkitImageSmoothingEnabled = isSmooth;
            ctx.msImageSmoothingEnabled = isSmooth;
            ctx.imageSmoothingEnabled = isSmooth;
        }
    }, {
        key: 'getRealFinalImgSize',
        value: function getRealFinalImgSize(curWidth, curHeight) {
            var width = curWidth;
            var height = curHeight;

            if (this.rotateStep & 1) {
                if (this.canvasFull.width > this.img.height) {
                    // 最大不会超过原图的尺寸
                    width = this.img.width * curWidth / this.canvasFull.height;
                    height = this.img.height * curHeight / this.canvasFull.width;
                }
            } else {
                if (this.canvasFull.width > this.img.width) {
                    // 最大不会超过原图的尺寸
                    width = this.img.width * curWidth / this.canvasFull.width;
                    height = this.img.height * curHeight / this.canvasFull.height;
                }
            }

            return {
                width: width,
                height: height
            };
        }

        /**
         * 裁剪
         */

    }, {
        key: 'clip',
        value: function clip() {
            var params = this.getClipRectParams();
            var srcX = params.srcX;
            var srcY = params.srcY;
            var sWidth = params.sWidth;
            var sHeight = params.sHeight;
            var realImgSize = this.getRealFinalImgSize(sWidth, sHeight);
            var curWidth = realImgSize.width;
            var curHeight = realImgSize.height;

            // 注意，这个变量可能不存在，会影响判断的
            this.rotateStep = this.rotateStep || 0;

            // 计算弧度
            var degree = this.rotateStep * 90 * Math.PI / 180;

            // 内部的转换矩阵也需要旋转（只不过不需要展示而已-譬如平移操作就无必要）
            // 注意，重置canvas大小后，以前的rotate也会无效
            // 否则如果不重置，直接rotate是会在以前的基础上
            if (this.rotateStep === 0) {
                this.canvasTransfer.width = curWidth;
                this.canvasTransfer.height = curHeight;
            } else if (this.rotateStep === 1) {
                this.canvasTransfer.width = curHeight;
                this.canvasTransfer.height = curWidth;
                this.ctxTransfer.rotate(degree);
                this.ctxTransfer.translate(0, -this.canvasTransfer.width);
            } else if (this.rotateStep === 2) {
                this.canvasTransfer.width = curWidth;
                this.canvasTransfer.height = curHeight;
                this.ctxTransfer.rotate(degree);
                this.ctxTransfer.translate(-this.canvasTransfer.width, -this.canvasTransfer.height);
            } else if (this.rotateStep === 3) {
                this.canvasTransfer.width = curHeight;
                this.canvasTransfer.height = curWidth;
                this.ctxTransfer.rotate(degree);
                this.ctxTransfer.translate(-this.canvasTransfer.height, 0);
            }

            // 生成新的图片,内部坐标会使用原图片的尺寸
            // 宽高在旋转不同的情况下是颠倒的
            if (this.rotateStep & 1) {
                this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, 0, 0, this.canvasTransfer.height, this.canvasTransfer.width);
            } else {
                this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, 0, 0, this.canvasTransfer.width, this.canvasTransfer.height);
            }

            this.clipImgData = this.canvasTransfer.toDataURL(this.options.mime, this.options.quality);
        }
    }, {
        key: 'clipRectReset',
        value: function clipRectReset() {
            this.clipRect.style.left = 0;
            this.clipRect.style.top = 0;
            this.clipRect.style.width = this.canvasFull.width / this.RATIO_PIXEL + 'px';
            this.clipRect.style.height = this.canvasFull.height / this.RATIO_PIXEL + 'px';
            this.draw();
        }
    }, {
        key: 'getClipImgData',
        value: function getClipImgData() {
            return this.clipImgData;
        }
    }, {
        key: 'rotate',
        value: function rotate(isClockWise) {
            // 最小和最大旋转方向
            var MIN_STEP = 0;
            var MAX_STEP = 3;
            var width = this.oldWidth;
            var height = this.oldHeight;

            this.rotateStep = this.rotateStep || 0;
            this.rotateStep += isClockWise ? 1 : -1;
            if (this.rotateStep > MAX_STEP) {
                this.rotateStep = MIN_STEP;
            } else if (this.rotateStep < MIN_STEP) {
                this.rotateStep = MAX_STEP;
            }

            // 计算弧度
            var degree = this.rotateStep * 90 * Math.PI / 180;

            // 重置canvas,重新计算旋转
            this.canvasMag.width = this.canvasMag.width;
            this.canvasMag.height = this.canvasMag.height;

            // 同时旋转mag canvas
            if (this.rotateStep === 0) {
                this.resizeCanvas(width, height);
            } else if (this.rotateStep === 1) {
                this.resizeCanvas(height, width);
                this.ctxFull.rotate(degree);
                this.ctxFull.translate(0, -this.canvasFull.width);
                this.ctxMag.rotate(degree);
                this.ctxMag.translate(0, -this.canvasMag.width);
            } else if (this.rotateStep === 2) {
                this.resizeCanvas(width, height);
                this.ctxFull.rotate(degree);
                this.ctxFull.translate(-this.canvasFull.width, -this.canvasFull.height);
                this.ctxMag.rotate(degree);
                this.ctxMag.translate(-this.canvasMag.width, -this.canvasMag.height);
            } else if (this.rotateStep === 3) {
                this.resizeCanvas(height, width);
                this.ctxFull.rotate(degree);
                this.ctxFull.translate(-this.canvasFull.height, 0);
                this.ctxMag.rotate(degree);
                this.ctxMag.translate(-this.canvasMag.height, 0);
            }

            this.clipRectReset();
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.clear();
            this.canvasFull = null;
            this.ctxFull = null;
            this.canvasTransfer = null;
            this.ctxTransfer = null;
            this.canvasMag = null;
            this.ctxMag = null;
            this.clipRect = null;
        }
    }], [{
        key: 'getPixelRatio',
        value: function getPixelRatio(context) {
            // 注意，backingStorePixelRatio属性已弃用
            var backingStore = context.backingStorePixelRatio || context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;

            return (window.devicePixelRatio || 1) / backingStore;
        }
    }]);

    return ImgClip;
}();

function clipMixin(ImageProcess) {
    var api = ImageProcess;

    api.ImgClip = ImgClip;
}

var ImageProcess = {};

scaleMixin(ImageProcess);
clipMixin(ImageProcess);

return ImageProcess;

})));
