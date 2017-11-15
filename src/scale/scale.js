import nearestNeighborInterpolation from '../scale/nearestneighbor';
import bilinearInterpolation from '../scale/bilinear';
import bicubicInterpolation from '../scale/bicubic';
import bicubicInterpolation2 from '../scale/bicubic2';
import {
    extend,
} from '../util/lang';

const defaultArgs = {
    width: 80,
    height: 80,
    mime: 'image/png',
    // 0: nearestNeighbor
    // 1: bilinearInterpolation
    // 2: bicubicInterpolation
    // 3: bicubicInterpolation2
    processType: 1,
};

const defaultArgsCompress = {
    // 压缩质量
    quality: 0.92,
    mime: 'image/jpeg',
    // 压缩时的放大系数，默认为1，如果增大，代表图像的尺寸会变大(最大不会超过原图)
    compressScaleRatio: 1,
    // ios的iPhone下主动放大一定系数以解决分辨率过小的模糊问题
    iphoneFixedRatio: 1.5,
    // 是否采用原图像素（不会改变大小）
    isUseOriginSize: false,
    // 增加最大宽度，增加后最大不会超过这个宽度
    maxWidth: 0,
    // 使用强制的宽度，如果使用，其它宽高比系数都会失效，默认整图使用这个宽度
    forceWidth: 0,
    // 同上，但是一般不建议设置，因为很可能会改变宽高比导致拉升，特殊场景下使用
    forceHeight: 0,
};

export default function scaleMixin(ImageScale) {
    const api = ImageScale;

    /**
     * 对ImageData类型的数据进行缩放，将数据放入新的imageData中
     * @param {ImageData} imageData 目标ImageData
     * @param {ImageData} newImageData 新的ImageData
     * @param {Object} args 额外参数
     */
    api.scaleImageData = function scaleImageData(imageData, newImageData, args) {
        const finalArgs = extend({}, defaultArgs, args);
        const processTypes = [
            nearestNeighborInterpolation,
            bilinearInterpolation,
            bicubicInterpolation,
            bicubicInterpolation2,
        ];
        const curDealFunc = processTypes[finalArgs.processType];

        curDealFunc(imageData, newImageData);
    };

    /**
     * 对Image类型的对象进行缩放，返回一个base64字符串
     * @param {Image} image 目标Image
     * @param {Object} args 额外参数
     * @return {String} 返回目标图片的b64字符串
     */
    api.scaleImage = function scaleImage(image, args) {
        const width = image.width;
        const height = image.height;
        const finalArgs = extend({}, defaultArgs, args);

        const canvasTransfer = document.createElement('canvas');
        const ctxTransfer = canvasTransfer.getContext('2d');

        canvasTransfer.width = width;
        canvasTransfer.height = height;

        ctxTransfer.drawImage(image,
            0, 0, width, height,
        );

        const imageData = ctxTransfer.getImageData(0, 0, width, height);
        const newImageData = ctxTransfer.createImageData(finalArgs.width, finalArgs.height);

        api.scaleImageData(imageData, newImageData, finalArgs);

        canvasTransfer.width = newImageData.width;
        canvasTransfer.height = newImageData.height;

        ctxTransfer.putImageData(newImageData,
            0, 0, 0, 0,
            canvasTransfer.width, canvasTransfer.height);

        // console.log(imageData);
        // console.log(newImageData);
        // console.log('压缩时w:' + canvasTransfer.width + ',' + canvasTransfer.height);

        return canvasTransfer.toDataURL(finalArgs.mime, 0.9);
    };
    
    function getPixelRatio(context) {
        const backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

        const ratio = (window.devicePixelRatio || 1) / backingStore;
        
        return ratio;
    }

    /**
     * 压缩图片，返回一个base64字符串
     * 与scale的区别是这用的是canvas默认缩放，并且有很多参数可控
     * @param {Image} image 目标Image
     * @param {Object} args 额外参数
     * @return {String} 返回目标图片的b64字符串
     */
    api.compressImage = function compressImage(image, args) {
        const width = image.width;
        const height = image.height;
        const wPerH = width / height;
        const finalArgs = extend({}, defaultArgsCompress, args);

        const canvasTransfer = document.createElement('canvas');
        const ctxTransfer = canvasTransfer.getContext('2d');

        let ratio = getPixelRatio(ctxTransfer);

        ratio *= finalArgs.compressScaleRatio || 1;
        if (navigator.userAgent.match(/(iPhone\sOS)\s([\d_]+)/)) {
            ratio *= finalArgs.iphoneFixedRatio || 1;
        }

        let finalWidth = window.innerWidth * ratio;

        if (finalArgs.isUseOriginSize || finalWidth > width) {
            // 最大不会超过原图的尺寸
            finalWidth = width;
        }
        
        const maxWidth = finalArgs.maxWidth;
        
        if (maxWidth && width > maxWidth && finalWidth > maxWidth) {
            // 考虑到之前已经进行不超过原图的判断了
            finalWidth = maxWidth;
        }
        const forceWidth = finalArgs.forceWidth;
        const forceHeight = finalArgs.forceHeight;
        
        if (forceWidth) {
            // 使用固定宽
            finalWidth = forceWidth;
        }
        
        let finalHeight = finalWidth / wPerH;
        
        if (forceHeight) {
            finalHeight = forceHeight;
        }

        canvasTransfer.width = finalWidth;
        canvasTransfer.height = finalHeight;
        ctxTransfer.drawImage(image,
            0, 0, width, height,
            0, 0, canvasTransfer.width, canvasTransfer.height,
        );

        return canvasTransfer.toDataURL(finalArgs.mime, finalArgs.quality);
    };
}