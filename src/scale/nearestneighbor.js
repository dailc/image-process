/**
 * 缩放算法
 * 最临邻近插值
 */

function scale(data, width, height, newData, newWidth, newHeight) {
    // 计算压缩后的缩放比
    const scaleW = newWidth / width;
    const scaleH = newHeight / height;
    const dstData = newData;
    
    const mapData = (dstCol, dstRow) => {
        const srcCol = Math.min(width - 1, dstCol / scaleW);
        const srcRow = Math.min(height - 1, dstRow / scaleH);
        const intCol = Math.floor(srcCol);
        const intRow = Math.floor(srcRow);
        
        // 真实的index，因为数组是一维的
        let dstI = (dstRow * newWidth) + dstCol;
        let srcI = (intRow * width) + intCol;
        
        // rgba，所以要乘以4
        dstI *= 4;
        srcI *= 4;
        
        for (let j = 0; j <= 3; j += 1) {
            dstData[dstI + j] = data[srcI + j];
        }
    };
    
    // 区块
    for (let x = 0; x < newWidth; x += 1) {
        for (let y = 0; y < newHeight; y += 1) {
            mapData(x, y);
        }
    }
}

export default function nearestNeighborInterpolation(imgData, newImgData) {
    scale(imgData.data,
        imgData.width,
        imgData.height,
        newImgData.data,
        newImgData.width,
        newImgData.height);
        
    return newImgData;
}