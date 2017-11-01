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
let a00;
let a01;
let a02;
let a03;
let a10;
let a11;
let a12;
let a13;
let a20;
let a21;
let a22;
let a23;
let a30;
let a31;
let a32;
let a33;

const getRGBAValue = (data, srcWidth, srcHeight, row, col, colorIndex) => {
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

    return data[newIndex + colorIndex];
};

const getPixelValue = (pixelValue) => {
    let newPixelValue = pixelValue;

    newPixelValue = Math.min(255, newPixelValue);
    newPixelValue = Math.max(0, newPixelValue);

    return newPixelValue;
};

const updateCoefficients = (tmpPixels) => {
    const p = tmpPixels;

    a00 = p[1][1];
    a01 = -0.5 * p[1][0]
        + 0.5 * p[1][2];
    a02 = p[1][0]
        - 2.5 * p[1][1]
        + 2 * p[1][2]
        - 0.5 * p[1][3];
    a03 = -0.5 * p[1][0]
        + 1.5 * p[1][1]
        - 1.5 * p[1][2]
        + 0.5 * p[1][3];

    a10 = -0.5 * p[0][1]
        + 0.5 * p[2][1];
    a11 = 0.25 * p[0][0]
        - 0.25 * p[0][2]
        - 0.25 * p[2][0]
        + 0.25 * p[2][2];
    a12 = -0.5 * p[0][0]
        + 1.25 * p[0][1]
        - p[0][2]
        + 0.25 * p[0][3]
        + 0.5 * p[2][0]
        - 1.25 * p[2][1]
        + p[2][2]
        - 0.25 * p[2][3];
    a13 = 0.25 * p[0][0]
        - 0.75 * p[0][1]
        + 0.75 * p[0][2]
        - 0.25 * p[0][3]
        - 0.25 * p[2][0]
        + 0.75 * p[2][1]
        - 0.75 * p[2][2]
        + 0.25 * p[2][3];

    a20 = p[0][1]
        - 2.5 * p[1][1]
        + 2 * p[2][1]
        - 0.5 * p[3][1];
    a21 = -0.5 * p[0][0]
        + 0.5 * p[0][2]
        + 1.25 * p[1][0]
        - 1.25 * p[1][2]
        - p[2][0]
        + p[2][2]
        + 0.25 * p[3][0]
        - 0.25 * p[3][2];
    a22 = p[0][0]
        - 2.5 * p[0][1]
        + 2 * p[0][2]
        - 0.5 * p[0][3]
        - 2.5 * p[1][0]
        + 6.25 * p[1][1]
        - 5 * p[1][2]
        + 1.25 * p[1][3]
        + 2 * p[2][0]
        - 5 * p[2][1]
        + 4 * p[2][2]
        - p[2][3]
        - 0.5 * p[3][0]
        + 1.25 * p[3][1]
        - p[3][2]
        + 0.25 * p[3][3];
    a23 = -0.5 * p[0][0]
        + 1.5 * p[0][1]
        - 1.5 * p[0][2]
        + 0.5 * p[0][3]
        + 1.25 * p[1][0]
        - 3.75 * p[1][1]
        + 3.75 * p[1][2]
        - 1.25 * p[1][3]
        - p[2][0]
        + 3 * p[2][1]
        - 3 * p[2][2]
        + p[2][3]
        + 0.25 * p[3][0]
        - 0.75 * p[3][1]
        + 0.75 * p[3][2]
        - 0.25 * p[3][3];

    a30 = -0.5 * p[0][1]
        + 1.5 * p[1][1]
        - 1.5 * p[2][1]
        + 0.5 * p[3][1];
    a31 = 0.25 * p[0][0]
        - 0.25 * p[0][2]
        - 0.75 * p[1][0]
        + 0.75 * p[1][2]
        + 0.75 * p[2][0]
        - 0.75 * p[2][2]
        - 0.25 * p[3][0]
        + 0.25 * p[3][2];
    a32 = -0.5 * p[0][0]
        + 1.25 * p[0][1]
        - p[0][2]
        + 0.25 * p[0][3]
        + 1.5 * p[1][0]
        - 3.75 * p[1][1]
        + 3 * p[1][2]
        - 0.75 * p[1][3]
        - 1.5 * p[2][0]
        + 3.75 * p[2][1]
        - 3 * p[2][2]
        + 0.75 * p[2][3]
        + 0.5 * p[3][0]
        - 1.25 * p[3][1]
        + p[3][2]
        - 0.25 * p[3][3];
    a33 = 0.25 * p[0][0]
        - 0.75 * p[0][1]
        + 0.75 * p[0][2]
        - 0.25 * p[0][3]
        - 0.75 * p[1][0]
        + 2.25 * p[1][1]
        - 2.25 * p[1][2]
        + 0.75 * p[1][3]
        + 0.75 * p[2][0]
        - 2.25 * p[2][1]
        + 2.25 * p[2][2]
        - 0.75 * p[2][3]
        - 0.25 * p[3][0]
        + 0.75 * p[3][1]
        - 0.75 * p[3][2]
        + 0.25 * p[3][3];
};

const getValue = (x, y) => {
    const x2 = x * x;
    const x3 = x2 * x;
    const y2 = y * y;
    const y3 = y2 * y;

    return (a00 + a01 * y + a02 * y2 + a03 * y3) +
        (a10 + a11 * y + a12 * y2 + a13 * y3) * x +
        (a20 + a21 * y + a22 * y2 + a23 * y3) * x2 +
        (a30 + a31 * y + a32 * y2 + a33 * y3) * x3;
};

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

        // 16个邻近像素的灰度（分别计算成rgba）
        const tmpPixels = [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
        ];
        // rgba
        for (let i = 0; i <= 3; i += 1) {
            // 16个临近点
            for (let m = -1; m <= 2; m += 1) {
                for (let n = -1; n <= 2; n += 1) {
                    tmpPixels[m + 1][n + 1] = getRGBAValue(
                        data,
                        width,
                        height,
                        intRow + m,
                        intCol + n,
                        i,
                    );
                }
            }
            
            // 更新系数
            updateCoefficients(tmpPixels);
            // 利用uv来求值
            dstData[dstI + i] = getPixelValue(getValue(v, u));
        }
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