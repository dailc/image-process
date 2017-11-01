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
const A = -1;

function interpolationCalculate(x) {
    const absX = x >= 0 ? x : -x;
    const x2 = x * x;
    const x3 = absX * x2;
    
    if (absX <= 1) {
        return 1 - (A + 3) * x2 + (A + 2) * x3;
    } else if (absX <= 2) {
        return -4 * A + 8 * A * absX - 5 * A * x2 + A * x3;
    }
    
    return 0;
}

function getPixelValue(pixelValue) {
    let newPixelValue = pixelValue;

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
function getRGBAValue(data, srcWidth, srcHeight, row, col) {
    let newRow = row;
    let newCol = col;

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

    let newIndex = (newRow * srcWidth) + newCol;

    newIndex *= 4;

    return [
        data[newIndex + 0],
        data[newIndex + 1],
        data[newIndex + 2],
        data[newIndex + 3],
    ];
}

function scale(data, width, height, newData, newWidth, newHeight) {
    const dstData = newData;

    // 计算压缩后的缩放比
    const scaleW = newWidth / width;
    const scaleH = newHeight / height;

    const filter = (dstCol, dstRow) => {
        // 源图像中的坐标（可能是一个浮点）
        const srcCol = Math.min(width - 1, dstCol / scaleW);
        const srcRow = Math.min(height - 1, dstRow / scaleH);
        const intCol = Math.floor(srcCol);
        const intRow = Math.floor(srcRow);
        // 计算u和v
        const u = srcCol - intCol;
        const v = srcRow - intRow;

        // 真实的index，因为数组是一维的
        let dstI = (dstRow * newWidth) + dstCol;

        dstI *= 4;
        
        // 存储灰度值的权重卷积和
        const rgbaData = [0, 0, 0, 0];
        // 根据数学推导，16个点的f1*f2加起来是趋近于1的（可能会有浮点误差）
        // 因此就不再单独先加权值，再除了
        // 16个邻近点
        for (let m = -1; m <= 2; m += 1) {
            for (let n = -1; n <= 2; n += 1) {
                const rgba = getRGBAValue(
                    data,
                    width,
                    height,
                    intRow + m,
                    intCol + n,
                );
                // 一定要正确区分 m,n和u,v对应的关系，否则会造成图像严重偏差（譬如出现噪点等）
                // F(row + m, col + n)S(m - v)S(n - u)
                const f1 = interpolationCalculate(m - v);
                const f2 = interpolationCalculate(n - u);
                const weight = f1 * f2;
                
                rgbaData[0] += rgba[0] * weight;
                rgbaData[1] += rgba[1] * weight;
                rgbaData[2] += rgba[2] * weight;
                rgbaData[3] += rgba[3] * weight;
            }
        }
        
        dstData[dstI + 0] = getPixelValue(rgbaData[0]);
        dstData[dstI + 1] = getPixelValue(rgbaData[1]);
        dstData[dstI + 2] = getPixelValue(rgbaData[2]);
        dstData[dstI + 3] = getPixelValue(rgbaData[3]);
    };

    // 区块
    for (let col = 0; col < newWidth; col += 1) {
        for (let row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

export default function bicubicInterpolation(imgData, newImgData) {
    scale(imgData.data,
        imgData.width,
        imgData.height,
        newImgData.data,
        newImgData.width,
        newImgData.height);

    return newImgData;
}
