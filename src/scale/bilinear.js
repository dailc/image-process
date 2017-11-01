/**
 * 缩放算法
 * 双线性差值，会损坏原图（带低通滤波器效果）
 * 公式：
 * Z =
 * 先y
 * (1-v) * [(1-u) * f(x0,y0) + u * f(x1,y0)] +
 * v * [(1-u) * f(x0,y1) + u * f(x1,y1)] +
 * 先x
 * (1-u) * [(1-v) * f(x0,y0) + v * f(x0,y1)] +
 * u * [(1-v) * f(x1,y0) + v * f(x1,y1)]
 * 其中u,v为目标坐标（浮动坐标）的小数部分，取值范围[0,1)
 * f(x,y)分别为最近的四个边界点
 */

function scale(data, width, height, newData, newWidth, newHeight) {
    // 计算压缩后的缩放比
    const scaleW = newWidth / width;
    const scaleH = newHeight / height;
    const dstData = newData;
    
    const mapData = (dstCol, dstRow) => {
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
        // 获取左上角位置,代表xy
        let index00 = (intRow * width) + intCol;
        let index01;
        let index10;
        let index11;
        
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
        
        
        for (let j = 0; j <= 3; j += 1) {
            // 两套公式
            const partV = v * ((u1 * data[index01 + j]) + (u * data[index11 + j]));
            const partV1 = v1 * ((u1 * data[index00 + j]) + (u * data[index10 + j]));
            
            dstData[dstI + j] = partV + partV1;
            // const partU = u * ((v1 * data[index10 + j]) + (v * data[index11 + j]));
            // const partU1 = u1 * ((v1 * data[index00 + j]) + (v * data[index01 + j]));
            
            // dstData[dstI + j] = partU + partU1;
        }
    };
    
    // 区块
    for (let col = 0; col < newWidth; col += 1) {
        for (let row = 0; row < newHeight; row += 1) {
            mapData(col, row);
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