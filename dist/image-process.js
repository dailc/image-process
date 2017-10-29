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

    var mapData = function mapData(dstCol, dstRow) {
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
            mapData(col, row);
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
 * 公式：
 * Z =
 * 
 * 先y
 * (1-v) * [(1-u) * f(x0,y0) + u * f(x1,y0)] +
 * v * [(1-u) * f(x0,y1) + u * f(x1,y1)] + 
 * 
 * 先x
 * (1-u) * [(1-v) * f(x0,y0) + v * f(x0,y1)] +
 * u * [(1-v) * f(x1,y0) + v * f(x1,y1)]
 * 
 * 其中u,v为目标坐标（浮动坐标）的小数部分，取值范围[0,1)
 * f(x,y)分别为最近的四个边界点
 */

function scale$1(data, width, height, newData, newWidth, newHeight) {
    // 计算压缩后的缩放比
    var scaleW = newWidth / width;
    var scaleH = newHeight / height;
    var dstData = newData;

    var mapData = function mapData(dstCol, dstRow) {
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
        // 获取左上角位置,代表xy
        var index00 = intRow * width + intCol;
        var index01 = void 0;
        var index10 = void 0;
        var index11 = void 0;

        // 获取其三个位置，需要判断是否溢出
        if (intCol < width - 1) {
            index10 = index00 + 1;
        } else {
            index10 = index00;
        }
        // 顺便11也可以取，因为11根据10来定的
        if (intRow < height - 1) {
            index01 = index00 + width;
            index11 = index10 + width;
        } else {
            index01 = index00;
            index11 = index10;
        }

        // rgba，所以要乘以4
        dstI *= 4;
        index00 *= 4;
        index01 *= 4;
        index10 *= 4;
        index11 *= 4;

        for (var j = 0; j <= 3; j += 1) {
            // 两套公式
            var partV = v * (u1 * data[index01 + j] + u * data[index11 + j]);
            var partV1 = v1 * (u1 * data[index00 + j] + u * data[index10 + j]);

            dstData[dstI + j] = partV + partV1;
            // const partU = u * ((v1 * data[index10 + j]) + (v * data[index11 + j]));
            // const partU1 = u1 * ((v1 * data[index00 + j]) + (v * data[index01 + j]));

            // dstData[dstI + j] = partU + partU1;
        }
    };

    // 区块
    for (var col = 0; col < newWidth; col += 1) {
        for (var row = 0; row < newHeight; row += 1) {
            mapData(col, row);
        }
    }
}

function bilinearInterpolation(imgData, newImgData) {
    scale$1(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

    return newImgData;
}

/**
 * 缩放算法
 * 双立方插值，图像更真实
 * 计算周围16个点
 */
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

// 返回一个一维数组，有四个值rgba
var getRGBAValue = function getRGBAValue(data, srcWidth, srcHeight, row, col, colorIndex) {
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

    var mapData = function mapData(dstCol, dstRow) {
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

        for (var i = 0; i <= 3; i += 1) {
            // 16个临近点,for循环速度要慢点，优化一部分
            for (var row = 0; row <= 3; row += 1) {
                tmpPixels[row][0] = getRGBAValue(data, width, height, intRow - 1 + row, intCol - 1, i);
                tmpPixels[row][1] = getRGBAValue(data, width, height, intRow - 1 + row, intCol, i);
                tmpPixels[row][2] = getRGBAValue(data, width, height, intRow - 1 + row, intCol + 1, i);
                tmpPixels[row][3] = getRGBAValue(data, width, height, intRow - 1 + row, intCol + 2, i);
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
            mapData(col, row);
        }
    }
}

function bicubicInterpolation(imgData, newImgData) {
    scale$2(imgData.data, imgData.width, imgData.height, newImgData.data, newImgData.width, newImgData.height);

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
        var processTypes = [nearestNeighborInterpolation, bilinearInterpolation, bicubicInterpolation];

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

        // console.log(imageData);
        // console.log(newImageData);
        // console.log('压缩时w:' + canvasTransfer.width + ',' + canvasTransfer.height);

        return canvasTransfer.toDataURL(finalArgs.mime, 0.9);
    };
}

var ImageProcess = {};

scaleMixin(ImageProcess);

return ImageProcess;

})));
