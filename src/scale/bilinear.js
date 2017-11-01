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
    // 计算压缩后的缩放比
    const scaleW = newWidth / width;
    const scaleH = newHeight / height;
    const dstData = newData;

    const filter = (dstCol, dstRow) => {
        // 源图像中的坐标（可能是一个浮点）
        const srcCol = Math.min(width - 1, dstCol / scaleW);
        const srcRow = Math.min(height - 1, dstRow / scaleH);
        const intCol = Math.floor(srcCol);
        const intRow = Math.floor(srcRow);
        // 计算u和v
        const u = srcCol - intCol;
        const v = srcRow - intRow;
        // 1-u与1-v
        const u1 = 1 - u;
        const v1 = 1 - v;

        // 真实的index，因为数组是一维的
        let dstI = (dstRow * newWidth) + dstCol;

        // rgba，所以要乘以4
        dstI *= 4;

        const rgba00 = getRGBAValue(
            data,
            width,
            height,
            intRow + 0,
            intCol + 0,
        );
        const rgba01 = getRGBAValue(
            data,
            width,
            height,
            intRow + 0,
            intCol + 1,
        );
        const rgba10 = getRGBAValue(
            data,
            width,
            height,
            intRow + 1,
            intCol + 0,
        );
        const rgba11 = getRGBAValue(
            data,
            width,
            height,
            intRow + 1,
            intCol + 1,
        );

        for (let j = 0; j <= 3; j += 1) {
            const partV = v * ((u1 * rgba10[j]) + (u * rgba11[j]));
            const partV1 = v1 * ((u1 * rgba00[j]) + (u * rgba01[j]));

            dstData[dstI + j] = partV + partV1;
        }
    };

    for (let col = 0; col < newWidth; col += 1) {
        for (let row = 0; row < newHeight; row += 1) {
            filter(col, row);
        }
    }
}

export default function bilinearInterpolation(imgData, newImgData) {
    scale(imgData.data,
        imgData.width,
        imgData.height,
        newImgData.data,
        newImgData.width,
        newImgData.height);

    return newImgData;
}