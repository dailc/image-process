import {
    extend,
    selector,
} from '../util/lang';
import Matrix from '../math/matrix';

const defaultetting = {
    container: '#imgclip',
    // 必须是一个image对象
    img: null,
    // 压缩质量
    quality: 0.92,
    isConstrain: true,
    // 是否开启平滑
    isSmooth: true,
    // 放大镜捕获的图像半径
    captureRadius: 20,
    // 多边形选择框的选择点半径大小
    choosePointRadius: 10,
    mime: 'image/jpeg',
};
let domChildren = [];
let events = {};

class ImgClip {
    /**
     * 构造函数
     * @param {Object} options 配置信息
     * @constructor
     */
    constructor(options) {
        this.options = extend({}, defaultetting, options);
        this.container = selector(this.options.container);

        this.clear();

        this.img = this.options.img;

        this.initCanvas();
        this.initClipRect();
        this.initMagnifier();
        this.initTransferCanvas();
        this.clipRectReset();
    }

    /**
     * 获取devicePixelRatio(像素比)
     * canvas绘制时乘以缩放系数，防止裁剪不清晰
     * （譬如320的手机上可能裁剪出来的就是640-系数是2）
     */
    static getPixelRatio(context) {
        // 注意，backingStorePixelRatio属性已弃用
        const backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

        return (window.devicePixelRatio || 1) / backingStore;
    }

    clear() {
        for (let i = 0; i < domChildren.length; i += 1) {
            this.container.removeChild(domChildren[i]);
        }
        domChildren = [];
    }

    initCanvas() {
        this.canvasFull = document.createElement('canvas');
        this.ctxFull = this.canvasFull.getContext('2d');
        this.smoothCtx(this.ctxFull);

        // 实际的像素比，绘制时基于这个比例绘制
        this.RATIO_PIXEL = ImgClip.getPixelRatio(this.ctxFull);
        // 获取图片的宽高比
        const wPerH = this.img.width / this.img.height;
        const originWidth = this.container.offsetWidth || window.innerWidth;

        this.originWidth = originWidth;
        this.originHeight = originWidth / wPerH;
        this.oldWidth = this.originWidth;
        this.oldHeight = this.originHeight;
        this.resizeCanvas(originWidth, this.originHeight);
        this.container.appendChild(this.canvasFull);
        domChildren.push(this.canvasFull);

        this.scale = this.canvasFull.width / this.img.width;
    }

    resizeCanvas(width, height) {
        const wPerH = width / height;
        const legalWidth = Math.min(width, this.originWidth);
        const legalHeight = legalWidth / wPerH;

        this.canvasFull.style.width = `${legalWidth}px`;
        this.canvasFull.style.height = `${legalHeight}px`;
        this.canvasFull.width = legalWidth * this.RATIO_PIXEL;
        this.canvasFull.height = legalHeight * this.RATIO_PIXEL;
        
        let scaleX = 1;
        let scaleY = 1;
        
        if (this.rotateStep & 1) {
            scaleX = legalHeight / this.oldWidth;
            scaleY = legalWidth / this.oldHeight;
        } else {
            scaleX = legalWidth / this.oldWidth;
            scaleY = legalHeight / this.oldHeight;
        }
        
        this.updateRectCoordinatesScale(scaleX, scaleY);
        
        this.oldWidth = legalWidth;
        this.oldHeight = legalHeight;
    }

    initClipRect() {
        this.resetRectCoordinates();
        this.listenerRectPoint();
    }
    
    updateRectCoordinatesScale(scaleX, scaleY) {
        if (!this.clipRectCoordinates) {
            return;
        }
        const rectArr = Object.keys(this.clipRectCoordinates);
        const len = rectArr.length;
        
        for (let i = 0; i < len; i += 1) {
            const curCoordinate = this.clipRectCoordinates[rectArr[i]];
            
            curCoordinate[0] *= scaleX;
            curCoordinate[1] *= scaleY;
        }
    }
    
    resetRectCoordinates() {
        let width = this.canvasFull.width;
        let height = this.canvasFull.height;
        
        if (this.rotateStep & 1) {
            // 如果是奇数旋转，需要交换宽高
            const tmp = width;
            
            width = height;
            height = tmp;
        }
        
        const halfW = width / 2;
        const halfH = height / 2;
        // 初始化八个坐标点,因为后续可能会拓展为多边形选择
        // 由于在canvas内，所以是基于canvas进行的定位
        this.clipRectCoordinates = {
            nw: [0, 0],
            n: [halfW, 0],
            ne: [width, 0],
            w: [0, halfH],
            e: [width, halfH],
            sw: [0, height],
            s: [halfW, height],
            se: [width, height],
        };
    }
    
    saveEventState(e, target) {
        const clipRectCoordinates = this.clipRectCoordinates;
        
        this.clipRectEventState = {};
        this.clipRectEventState.nw = clipRectCoordinates.nw.slice(0);
        this.clipRectEventState.n = clipRectCoordinates.n.slice(0);
        this.clipRectEventState.ne = clipRectCoordinates.ne.slice(0);
        this.clipRectEventState.w = clipRectCoordinates.w.slice(0);
        this.clipRectEventState.e = clipRectCoordinates.e.slice(0);
        this.clipRectEventState.sw = clipRectCoordinates.sw.slice(0);
        this.clipRectEventState.s = clipRectCoordinates.s.slice(0);
        this.clipRectEventState.se = clipRectCoordinates.se.slice(0);
        
        // 当前处于哪一个点的范围
        this.clipRectEventState.target = target;
    }
    
    whichTargetCurCoordinateInClipRect(x, y) {
        // 判断当前的坐标点是否在合理的裁剪框控制点中,返回对于的控制点，非法返回null
        const radius = this.options.choosePointRadius * 3;
        const rectArr = Object.keys(this.clipRectCoordinates);
        const len = rectArr.length;
        
        for (let i = 0; i < len; i += 1) {
            const curCoordinate = this.clipRectCoordinates[rectArr[i]];
            
            // 简单的矩形判断
            if (Math.abs(x - curCoordinate[0]) <= radius &&
                Math.abs(y - curCoordinate[1]) <= radius) {
                // 找到了目标点
                return rectArr[i];
            }
        }
        
        return null;
    }
    
    listenerRectPoint() {
        // canvas中监听几个点的改动
        const startResize = (e) => {
            // 判断点击是否在范围
            // 区分pageX与clientX
            const mouseY = e.touches ? e.touches[0].pageY : e.pageY;
            const mouseX = e.touches ? e.touches[0].pageX : e.pageX;
            // canvas在container内部没有间隙
            let curY = mouseY - this.container.offsetTop;
            let curX = mouseX - this.container.offsetLeft;
            
            curY *= this.canvasFull.height / this.container.offsetHeight;
            curX *= this.canvasFull.width / this.container.offsetWidth;
            
            const target = this.whichTargetCurCoordinateInClipRect(curX, curY);
            
            if (!target) {
                // 非法坐标，直接返回
                return;
            }
            this.canResizing = true;
            this.saveEventState(e, target);
            this.canvasMag.classList.remove('clip-hidden');
        };
        const endResize = () => {
            this.canResizing = false;
            this.canvasMag.classList.add('clip-hidden');
        };
        
        this.canvasFull.addEventListener('mousedown', startResize);
        this.canvasFull.addEventListener('touchstart', startResize);
        events.mousedown = startResize;
        events.touchstart = startResize;

        this.canvasFull.addEventListener('mouseleave', endResize);
        this.canvasFull.addEventListener('mouseup', endResize);
        events.mouseleave = endResize;
        events.mouseup = endResize;

        const moving = (e) => {
            if (!this.canResizing) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            
            const clipRectCoordinates = this.clipRectCoordinates;
            const clipRectEventState = this.clipRectEventState;
            const target = clipRectEventState.target;
            const isConstrain = this.options.isConstrain;
            // 区分pageX与clientX
            const mouseY = e.touches ? e.touches[0].pageY : e.pageY;
            const mouseX = e.touches ? e.touches[0].pageX : e.pageX;
            // canvas在container内部没有间隙
            let curY = mouseY - this.container.offsetTop;
            let curX = mouseX - this.container.offsetLeft;
            
            curY *= this.canvasFull.height / this.container.offsetHeight;
            curX *= this.canvasFull.width / this.container.offsetWidth;

            if (isConstrain) {
                if (this.rotateStep & 1) {
                    curY = Math.min(curY, this.canvasFull.width);
                    curX = Math.min(curX, this.canvasFull.height);
                } else {
                    curY = Math.min(curY, this.canvasFull.height);
                    curX = Math.min(curX, this.canvasFull.width);
                }
                curY = Math.max(0, curY);
                curX = Math.max(0, curX);
            }

            this.curX = curX;
            this.curY = curY;
            
            clipRectCoordinates[target] = [curX, curY];
            this.draw();
        };

        this.canvasFull.addEventListener('touchmove', moving);
        this.canvasFull.addEventListener('mousemove', moving);

        events.touchmove = moving;
        events.mousemove = moving;
    }
    
    clipRectReset() {
        this.resetRectCoordinates();
        this.draw();
    }

    drawClipRect() {
        const coordinates = this.clipRectCoordinates;
        
        this.ctxFull.beginPath();
        
        // 从左上开始，顺时针一直到再次回到左上
        this.ctxFull.moveTo(coordinates.nw[0], coordinates.nw[1]);
        this.ctxFull.lineTo(coordinates.n[0], coordinates.n[1]);
        this.ctxFull.lineTo(coordinates.ne[0], coordinates.ne[1]);
        this.ctxFull.lineTo(coordinates.e[0], coordinates.e[1]);
        this.ctxFull.lineTo(coordinates.se[0], coordinates.se[1]);
        this.ctxFull.lineTo(coordinates.s[0], coordinates.s[1]);
        this.ctxFull.lineTo(coordinates.sw[0], coordinates.sw[1]);
        this.ctxFull.lineTo(coordinates.w[0], coordinates.w[1]);
        
        // 起闭合形状作用,会回到原点
        this.ctxFull.closePath();
        
        this.ctxFull.lineWidth = 3;
        this.ctxFull.strokeStyle = '#de3c50';
        this.ctxFull.stroke();
        
        // 绘制几个节点（选择点）
        const pointRadius = this.options.choosePointRadius;
        
        for (let i = 0; i < 8; i += 1) {
            const key = Object.keys(coordinates)[i];
            const coordinate = coordinates[key];
            
            this.ctxFull.beginPath();
            this.ctxFull.arc(coordinate[0], coordinate[1], pointRadius, 0, 2 * Math.PI);
            this.ctxFull.closePath();
            this.ctxFull.strokeStyle = '#de3c50';
            this.ctxFull.stroke();
            this.ctxFull.fillStyle = 'rgba(222, 60, 80, .7)';
            this.ctxFull.fill();
        }
    }

    draw() {
        this.drawMag();

        this.ctxFull.save();
        this.ctxFull.clearRect(0, 0, this.canvasFull.width, this.canvasFull.height);
        this.drawImage();
        this.drawMask();
        
       
        
        const coordinates = this.clipRectCoordinates;
        
        this.ctxFull.beginPath();
        this.ctxFull.moveTo(coordinates.nw[0], coordinates.nw[1]);
        this.ctxFull.lineTo(coordinates.n[0], coordinates.n[1]);
        this.ctxFull.lineTo(coordinates.ne[0], coordinates.ne[1]);
        this.ctxFull.lineTo(coordinates.e[0], coordinates.e[1]);
        this.ctxFull.lineTo(coordinates.se[0], coordinates.se[1]);
        this.ctxFull.lineTo(coordinates.s[0], coordinates.s[1]);
        this.ctxFull.lineTo(coordinates.sw[0], coordinates.sw[1]);
        this.ctxFull.lineTo(coordinates.w[0], coordinates.w[1]);
        this.ctxFull.closePath();

        this.ctxFull.clip();
        this.drawImage();
        this.ctxFull.restore();
        
        this.drawClipRect();
    }

    drawImage() {
        // 宽高在旋转不同的情况下是颠倒的
        if (this.rotateStep & 1) {
            this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height,
                0, 0, this.canvasFull.height, this.canvasFull.width);
        } else {
            this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height,
                0, 0, this.canvasFull.width, this.canvasFull.height);
        }
    }

    drawMask() {
        this.ctxFull.save();

        this.ctxFull.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctxFull.fillRect(0, 0, this.canvasFull.width, this.canvasFull.height);

        this.ctxFull.restore();
    }

    initMagnifier() {
        this.canvasMag = document.createElement('canvas');
        this.canvasMag.className = 'magnifier clip-hidden';
        this.ctxMag = this.canvasMag.getContext('2d');
        this.container.appendChild(this.canvasMag);
        domChildren.push(this.canvasMag);
    }

    drawMag() {
        return ;
        // TODO: 需要换为full中的实际数据,坐标计算也要注意
        const captureRadius = this.options.captureRadius;
        const srcX = this.curX * this.RATIO_PIXEL - captureRadius;
        const srcY = this.curY * this.RATIO_PIXEL - captureRadius;
        const sWidth = captureRadius * 2;
        const sHeight = captureRadius * 2;

        this.ctxMag.clearRect(0, 0, this.canvasMag.width, this.canvasMag.height);
        // 生成新的图片,内部坐标会使用原图片的尺寸
        this.ctxMag.drawImage(this.img, srcX / this.scale, srcY / this.scale,
            sWidth / this.scale, sHeight / this.scale,
            0, 0, this.canvasMag.width, this.canvasMag.height);
    }

    initTransferCanvas() {
        this.canvasTransfer = document.createElement('canvas');
        this.canvasTransfer.style.display = 'none';
        this.ctxTransfer = this.canvasTransfer.getContext('2d');
        this.smoothCtx(this.ctxTransfer);

        this.container.appendChild(this.canvasTransfer);
        domChildren.push(this.canvasTransfer);
    }

    smoothCtx(ctx) {
        const isSmooth = this.options.isSmooth;

        ctx.mozImageSmoothingEnabled = isSmooth;
        ctx.webkitImageSmoothingEnabled = isSmooth;
        ctx.msImageSmoothingEnabled = isSmooth;
        ctx.imageSmoothingEnabled = isSmooth;
    }

    /**
     * 裁剪
     */
    clip(isOriginSize) {
        const coordinates = this.clipRectCoordinates;
        const srcX = coordinates.nw[0];
        const srcY = coordinates.nw[1];
        const sWidth = coordinates.ne[0] - coordinates.nw[0];
        const sHeight = coordinates.se[1] - coordinates.ne[1];

        if (isOriginSize) {
            // 原始图片尺寸
            this.canvasTransfer.width = this.img.width;
            this.canvasTransfer.height = this.img.height;
        } else {
            // 当前截取的大小
            this.canvasTransfer.width = sWidth;
            this.canvasTransfer.height = sHeight;
        }

        // 生成新的图片,内部坐标会使用原图片的尺寸
        this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale,
            sWidth / this.scale, sHeight / this.scale,
            0, 0, this.canvasTransfer.width, this.canvasTransfer.height);

        this.clipImgData = this.canvasTransfer.toDataURL(this.options.mime, this.options.quality);
    }

    getClipImgData() {
        return this.clipImgData;
    }

    /**
     * 旋转变换，角度逆时针为正方向
     * @param {Array} coordinates 需要变换的坐标，一维数组
     * @param {Number} theta 需要旋转的角度
     * @return {Array} 返回计算后的新坐标
     */
    static rotateTransform(coordinates, theta) {
        const rotateMatrix = new Matrix({
            data: [
                [Math.cos(theta), -Math.sin(theta)],
                [Math.sin(theta), Math.cos(theta)],
            ],
            rows: 2,
            cols: 2,
        });

        const coordinatesMatrix = new Matrix({
            data: coordinates,
            rows: 2,
            cols: 1,
        });

        return rotateMatrix.multipy(coordinatesMatrix).data;
    }

    rotate(isClockWise) {
        // 最小和最大旋转方向
        const MIN_STEP = 0;
        const MAX_STEP = 3;
        const width = this.originWidth;
        const height = this.originHeight;

        this.rotateStep = this.rotateStep || 0;
        this.rotateStep += isClockWise ? 1 : -1;
        if (this.rotateStep > MAX_STEP) {
            this.rotateStep = MIN_STEP;
        } else if (this.rotateStep < MIN_STEP) {
            this.rotateStep = MAX_STEP;
        }

        // 计算弧度
        const degree = this.rotateStep * 90 * Math.PI / 180;

        if (this.rotateStep === 0) {
            this.resizeCanvas(width, height);
            this.draw();
        } else if (this.rotateStep === 1) {
            this.resizeCanvas(height, width);
            this.ctxFull.rotate(degree);
            this.ctxFull.translate(0, -this.canvasFull.width);
            this.draw();
        } else if (this.rotateStep === 2) {
            this.resizeCanvas(width, height);
            this.ctxFull.rotate(degree);
            this.ctxFull.translate(-this.canvasFull.width, -this.canvasFull.height);
            this.draw();
        } else if (this.rotateStep === 3) {
            this.resizeCanvas(height, width);
            this.ctxFull.rotate(degree);
            this.ctxFull.translate(-this.canvasFull.height, 0);
            this.draw();
        }
    }

    destroy() {
        this.clear();
        this.canvasFull = null;
        this.ctxFull = null;
        this.canvasTransfer = null;
        this.ctxTransfer = null;
        this.canvasMag = null;
        this.ctxMag = null;
        this.clipRect = null;
    }
}

export default ImgClip;