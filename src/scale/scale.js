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
    processType: 0,
};

export default function scaleMixin(ImageScale) {
    const api = ImageScale;
    
    /**
     * 对img对象进行缩放，返回一个base64字符串
     * @param {Image} image 目标image
     * @return {String} 返回目标图片的b64字符串
     */
    api.scaleImage = function scaleImage(image, args) {
        const width = image.width;
        const height = image.height;
        const finalArgs = extend({}, defaultArgs, args);
        const processTypes = [nearestNeighborInterpolation,
            bilinearInterpolation,
            bicubicInterpolation,
            bicubicInterpolation2,
        ];
        
        const canvasTransfer = document.createElement('canvas');
        const ctxTransfer = canvasTransfer.getContext('2d');
        
        canvasTransfer.width = width;
        canvasTransfer.height = height;
        
        ctxTransfer.drawImage(image,
            0, 0, width, height,
        );
        
        const imageData = ctxTransfer.getImageData(0, 0, width, height);
        let newImageData = ctxTransfer.createImageData(finalArgs.width, finalArgs.height);
        
        newImageData = processTypes[finalArgs.processType](
            imageData, newImageData, finalArgs);
        
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
}
