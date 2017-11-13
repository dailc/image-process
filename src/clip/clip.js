/**
 * ios内部显示的图片数据和img的原始图片是不一样的，坐标系不一样
 */

import {
    extend,
    selector,
} from '../util/lang';

import osMixin from '../mixin/os';

const defaultetting = {
    container: '#imgclip',
    // 必须是一个image对象
    img: null,
    // 压缩质量
    quality: 0.92,
    // 是否开启平滑
    isSmooth: true,
    // 放大镜捕获的图像半径
    captureRadius: 30,
    // ios的iPhone下主动放大一定系数以解决分辨率过小的模糊问题
    iphoneFixedRatio: 2,
    // 大小框的风格，0-点击时显示，1-恒显示，-1-永不显示
    sizeTipsStyle: 0,
    // 压缩时的放大系数，默认为1，如果增大，代表图像的尺寸会变大(最大不会超过原图)
    compressScaleRatio: 1,
    // 限制canvas显示的最大高度（不是实际高度，是css显示的最大高度）
    // 单位是像素，不传的话不限制
    maxCssHeight: null,
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

        osMixin(this);
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
    getPixelRatio(context) {
        // 注意，backingStorePixelRatio属性已弃用
        const backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;

        let ratio = (window.devicePixelRatio || 1) / backingStore;
        
        ratio *= this.options.compressScaleRatio || 1;
        if (this.os.ios && this.os.iphone) {
            ratio *= this.options.iphoneFixedRatio || 1;
        }

        return ratio;
    }

    clear() {
        for (let i = 0; i < domChildren.length; i += 1) {
            this.container.removeChild(domChildren[i]);
        }
        domChildren = [];

        const allEventNames = Object.keys(events);

        for (let i = 0; i < allEventNames.length; i += 1) {
            this.container.removeEventListener(allEventNames[i], events[allEventNames[i]]);
        }
        events = {};
    }

    initCanvas() {
        this.canvasFull = document.createElement('canvas');
        this.ctxFull = this.canvasFull.getContext('2d');
        this.canvasFull.className = 'clip-canvas-full';
        this.smoothCtx(this.ctxFull);

        // 实际的像素比，绘制时基于这个比例绘制
        this.RATIO_PIXEL = this.getPixelRatio(this.ctxFull);
        // 获取图片的宽高比
        const wPerH = this.img.width / this.img.height;
        const oldWidth = this.container.offsetWidth || window.innerWidth;

        this.oldWidth = oldWidth;
        this.oldHeight = oldWidth / wPerH;
        this.resizeCanvas(oldWidth, this.oldHeight);
        this.container.appendChild(this.canvasFull);
        domChildren.push(this.canvasFull);
    }

    resizeCanvas(width, height) {
        const maxCssHeight = this.options.maxCssHeight;
        const wPerH = width / height;
        let legalWidth = this.oldWidth;
        let legalHeight = legalWidth / wPerH;
        
        if (maxCssHeight && legalHeight > maxCssHeight) {
            legalHeight = maxCssHeight;
            legalWidth = legalHeight * wPerH;
        }
        this.marginLeft = (this.oldWidth - legalWidth) / 2;
        
        this.canvasFull.style.width = `${legalWidth}px`;
        this.canvasFull.style.height = `${legalHeight}px`;
        this.canvasFull.style.marginLeft = `${this.marginLeft}px`;
        this.canvasFull.width = legalWidth * this.RATIO_PIXEL;
        this.canvasFull.height = legalHeight * this.RATIO_PIXEL;

        if (this.rotateStep & 1) {
            this.scale = this.canvasFull.width / this.img.height;
        } else {
            this.scale = this.canvasFull.width / this.img.width;
        }
    }

    initClip() {
        const clipRect = document.createElement('div');

        clipRect.className = 'clip-rect';

        this.clipRect = clipRect;
        this.container.appendChild(this.clipRect);
        domChildren.push(this.clipRect);

        // 添加tips
        const clipTips = document.createElement('span');

        clipTips.className = 'clip-tips';
        this.clipRect.appendChild(clipTips);
        this.clipTips = clipTips;

        if (this.options.sizeTipsStyle === -1 ||
            this.options.sizeTipsStyle === 0) {
            // clipTips,canvas之外的
            this.clipTips.classList.add('clip-hidden');
        }

        this.clipRectHorns = [];
        // 添加8个角
        for (let i = 0; i < 8; i += 1) {
            const spanHorn = document.createElement('span');

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

    resizeClip() {
        const getCurXY = (mouseX, mouseY) => {
            // 父容器的top和left也要减去
            let curY = mouseY - this.canvasFull.offsetTop - this.container.offsetTop;
            let curX = mouseX - this.canvasFull.offsetLeft - this.container.offsetLeft;

            curY = Math.min(curY, this.canvasFull.offsetHeight);
            curY = Math.max(0, curY);
            curX = Math.min(curX, this.canvasFull.offsetWidth);
            curX = Math.max(0, curX);

            this.curX = curX;
            this.curY = curY;
            
            return {
                curX,
                curY,
            };
        };
        const moving = (e) => {
            if (!this.canResizing) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const clipEventState = this.clipEventState;
            const target = clipEventState.evnt.target;
            // 区分pageX与clientX
            const mouseY = e.touches ? e.touches[0].pageY : e.pageY;
            const mouseX = e.touches ? e.touches[0].pageX : e.pageX;
            const curCooidinate = getCurXY(mouseX, mouseY);
            const curX = curCooidinate.curX;
            const curY = curCooidinate.curY;
            let width;
            let height;
            let left;
            let top;

            if (target.classList.contains('horn-nw')) {
                width = clipEventState.width -
                    (curX - clipEventState.left);
                height = clipEventState.height -
                    (curY - clipEventState.top);
                left = curX;
                top = curY;
            } else if (target.classList.contains('horn-ne')) {
                width = curX - clipEventState.left;
                height = clipEventState.height -
                    (curY - clipEventState.top);
                left = clipEventState.left;
                top = curY;
            } else if (target.classList.contains('horn-sw')) {
                width = clipEventState.width -
                    (curX - clipEventState.left);
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
                height = clipEventState.height -
                    (curY - clipEventState.top);
                left = clipEventState.left;
                top = curY;
            } else if (target.classList.contains('horn-s')) {
                width = clipEventState.width;
                height = curY - clipEventState.top;
                left = clipEventState.left;
                top = clipEventState.top;
            } else if (target.classList.contains('horn-w')) {
                width = clipEventState.width -
                    (curX - clipEventState.left);
                height = clipEventState.height;
                left = curX;
                top = clipEventState.top;
            } else if (target.classList.contains('horn-e')) {
                width = curX - clipEventState.left;
                height = clipEventState.height;
                left = curX - width;
                top = clipEventState.top;
            }
            // 一定要补上leftmargin
            this.clipRect.style.left = `${left + this.marginLeft}px`;
            this.clipRect.style.top = `${top}px`;
            this.clipRect.style.width = `${width}px`;
            this.clipRect.style.height = `${height}px`;
            this.draw();
        };

        this.container.addEventListener('touchmove', moving);
        this.container.addEventListener('mousemove', moving);

        events.touchmove = moving;
        events.mousemove = moving;
        
        const startResize = (e) => {
            this.canResizing = true;
            this.saveEventState(e);
            this.canvasMag.classList.remove('clip-hidden');
            if (this.options.sizeTipsStyle === 0) {
                this.clipTips.classList.remove('clip-hidden');
            }
            // 及时更新一次,防止不刷新放大镜
            const mouseY = e.touches ? e.touches[0].pageY : e.pageY;
            const mouseX = e.touches ? e.touches[0].pageX : e.pageX;
            
            getCurXY(mouseX, mouseY);
            this.draw();
        };
        const endResize = () => {
            this.canResizing = false;
            this.canvasMag.classList.add('clip-hidden');
            if (this.options.sizeTipsStyle === 0) {
                this.clipTips.classList.add('clip-hidden');
            }
        };

        for (let i = 0; i < 8; i += 1) {
            this.clipRectHorns[i].addEventListener('mousedown', startResize);
            this.clipRectHorns[i].addEventListener('touchstart', startResize);

            this.clipRectHorns[i].addEventListener('mouseup', endResize);
            this.clipRectHorns[i].addEventListener('touchend', endResize);
        }

        this.container.addEventListener('mouseleave', endResize);
        this.container.addEventListener('mouseup', endResize);
        events.mouseleave = endResize;
        events.mouseup = endResize;
    }

    saveEventState(e) {
        this.clipEventState.width = this.clipRect.offsetWidth;
        this.clipEventState.height = this.clipRect.offsetHeight;
        this.clipEventState.left = this.clipRect.offsetLeft - this.marginLeft;
        this.clipEventState.top = this.clipRect.offsetTop;
        this.clipEventState.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
        this.clipEventState.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
        this.clipEventState.evnt = e;
    }

    draw() {
        // 放大镜
        this.drawMag();
        const realImgSize = this.getRealFinalImgSize(this.clipRect.offsetWidth * this.RATIO_PIXEL,
            this.clipRect.offsetHeight * this.RATIO_PIXEL);
        const curWidth = realImgSize.width;
        const curHeight = realImgSize.height;

        this.clipTips.innerText = `${curWidth.toFixed(0)}*${curHeight.toFixed(0)}`;

        this.ctxFull.save();
        if (this.rotateStep & 1) {
            this.ctxFull.clearRect(0, 0, this.canvasFull.height, this.canvasFull.width);
        } else {
            this.ctxFull.clearRect(0, 0, this.canvasFull.width, this.canvasFull.height);
        }

        this.drawImage();
        this.drawMask();

        this.ctxFull.beginPath();

        const params = this.getClipRectParams();
        const srcX = params.srcX;
        const srcY = params.srcY;
        const sWidth = params.sWidth;
        const sHeight = params.sHeight;

        this.ctxFull.rect(srcX, srcY, sWidth, sHeight);
        this.ctxFull.clip();
        this.drawImage();
        this.ctxFull.restore();
    }

    getClipRectParams() {
        const offsetTop = this.clipRect.offsetTop;
        // 减去margin才是真实的
        const offsetLeft = this.clipRect.offsetLeft - this.marginLeft;
        const offsetWidth = this.clipRect.offsetWidth;
        const offsetHeight = this.clipRect.offsetHeight;
        const offsetRight = offsetLeft + offsetWidth;
        const offsetBottom = offsetTop + offsetHeight;
        
        let srcX = offsetLeft;
        let srcY = offsetTop;
        let sWidth = offsetWidth;
        let sHeight = offsetHeight;

        if (this.rotateStep === 1) {
            srcX = offsetTop;
            srcY = this.canvasFull.offsetWidth - offsetRight;
            sWidth = offsetHeight;
            sHeight = offsetWidth;
        } else if (this.rotateStep === 2) {
            srcX = this.canvasFull.offsetWidth - offsetRight;
            srcY = this.canvasFull.offsetHeight - offsetBottom;
            sWidth = offsetWidth;
            sHeight = offsetHeight;
        } else if (this.rotateStep === 3) {
            srcX = this.canvasFull.offsetHeight - offsetBottom;
            srcY = offsetLeft;
            sWidth = offsetHeight;
            sHeight = offsetWidth;
        }

        srcX *= this.RATIO_PIXEL;
        srcY *= this.RATIO_PIXEL;
        sWidth *= this.RATIO_PIXEL;
        sHeight *= this.RATIO_PIXEL;

        return {
            srcX,
            srcY,
            sWidth,
            sHeight,
        };
    }

    getRealCoordinate(mouseX, mouseY) {
        // 获取真实坐标系（旋转缩放后的）
        let x = mouseX;
        let y = mouseY;

        if (this.rotateStep === 1) {
            x = mouseY;
            y = this.canvasFull.offsetWidth - mouseX;
        } else if (this.rotateStep === 2) {
            x = this.canvasFull.offsetWidth - mouseX;
            y = this.canvasFull.offsetHeight - mouseY;
        } else if (this.rotateStep === 3) {
            x = this.canvasFull.offsetHeight - mouseY;
            y = mouseX;
        }

        x *= this.RATIO_PIXEL;
        y *= this.RATIO_PIXEL;

        return {
            x,
            y,
        };
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
        if (this.rotateStep & 1) {
            this.ctxFull.fillRect(0, 0, this.canvasFull.height, this.canvasFull.width);
        } else {
            this.ctxFull.fillRect(0, 0, this.canvasFull.width, this.canvasFull.height);
        }

        this.ctxFull.restore();
    }

    drawMag() {
        const captureRadius = this.options.captureRadius;
        const centerPoint = this.getRealCoordinate(this.curX, this.curY);
        const sWidth = captureRadius * 2;
        const sHeight = captureRadius * 2;
        let srcX = centerPoint.x - captureRadius;
        let srcY = centerPoint.y - captureRadius;
        
        
        // TODO: 需要修改回来，仅供调试使用
        // this.clipTips.innerText = `,x:${srcX.toFixed(0)},y:${srcY.toFixed(0)}`;

        if (this.rotateStep & 1) {
            this.ctxMag.clearRect(0, 0, this.canvasMag.height, this.canvasMag.width);
        } else {
            this.ctxMag.clearRect(0, 0, this.canvasMag.width, this.canvasMag.height);
        }
        
        let drawX = 0;
        let drawY = 0;
        
        if (this.os.ios) {
            // 兼容ios的Safari不能绘制srcX,srcY为负的情况
            if (srcY < 0) {
                // 注意先后顺序
                drawY = (this.canvasMag.height / 2) * Math.abs(srcY / captureRadius);
                srcY = 0;
            }
            if (srcX < 0) {
                // 注意先后顺序
                drawX = (this.canvasMag.width / 2) * Math.abs(srcX / captureRadius);
                srcX = 0;
            }
        }
        
        // 生成新的图片,内部坐标会使用原图片的尺寸
        this.ctxMag.drawImage(this.img, srcX / this.scale, srcY / this.scale,
            sWidth / this.scale, sHeight / this.scale,
            drawX, drawY, this.canvasMag.width, this.canvasMag.height);
            
        const centerX = this.canvasMag.width / 2;
        const centerY = this.canvasMag.height / 2;
        const radius = 5 * this.RATIO_PIXEL;

        // 绘制十字校准
        this.ctxMag.beginPath();
        this.ctxMag.moveTo(centerX - radius, centerY);
        this.ctxMag.lineTo(centerX + radius, centerY);
        // this.ctxMag.arc(centerX + radius, centerY, 3, 0, 2 * Math.PI);
        this.ctxMag.moveTo(centerX, centerY - radius);
        this.ctxMag.lineTo(centerX, centerY + radius);
        // this.ctxMag.arc(centerX, centerY + radius, 3, 0, 2 * Math.PI);
        this.ctxMag.strokeStyle = '#de3c50';
        this.ctxMag.lineWidth = 3;
        this.ctxMag.stroke();
    }

    initMagnifier() {
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

    initTransferCanvas() {
        this.canvasTransfer = document.createElement('canvas');
        this.canvasTransfer.style.display = 'none';
        this.canvasTransfer.className = 'transfer-canvas';
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

    getRealFinalImgSize(curWidth, curHeight) {
        let width = curWidth;
        let height = curHeight;

        if (this.rotateStep & 1) {
            if (this.canvasFull.width > this.img.height) {
                // 最大不会超过原图的尺寸
                width = this.img.width * curWidth / this.canvasFull.height;
                height = this.img.height * curHeight / this.canvasFull.width;
            }
        } else if (this.canvasFull.width > this.img.width) {
            // 最大不会超过原图的尺寸
            width = this.img.width * curWidth / this.canvasFull.width;
            height = this.img.height * curHeight / this.canvasFull.height;
        }

        return {
            width,
            height,
        };
    }

    /**
     * 裁剪
     */
    clip() {
        const params = this.getClipRectParams();
        const srcX = params.srcX;
        const srcY = params.srcY;
        const sWidth = params.sWidth;
        const sHeight = params.sHeight;
        const realImgSize = this.getRealFinalImgSize(sWidth, sHeight);
        const curWidth = realImgSize.width;
        const curHeight = realImgSize.height;

        // 注意，这个变量可能不存在，会影响判断的，所以要确保它存在
        this.rotateStep = this.rotateStep || 0;

        // 计算弧度
        const degree = this.rotateStep * 90 * Math.PI / 180;

        // 内部的转换矩阵也需要旋转（只不过不需要展示而已-譬如平移操作就无必要）
        // 注意，重置canvas大小后，以前的rotate也会无效-
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
            this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale,
                sWidth / this.scale, sHeight / this.scale,
                0, 0, this.canvasTransfer.height, this.canvasTransfer.width);
        } else {
            this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale,
                sWidth / this.scale, sHeight / this.scale,
                0, 0, this.canvasTransfer.width, this.canvasTransfer.height);
        }

        this.clipImgData = this.canvasTransfer.toDataURL(this.options.mime, this.options.quality);
    }

    clipRectReset() {
        this.clipRect.style.left = `${this.marginLeft || 0}px`;
        this.clipRect.style.top = 0;
        this.clipRect.style.width = `${this.canvasFull.width / this.RATIO_PIXEL}px`;
        this.clipRect.style.height = `${this.canvasFull.height / this.RATIO_PIXEL}px`;
        this.draw();
    }

    getClipImgData() {
        return this.clipImgData;
    }

    rotate(isClockWise) {
        // 最小和最大旋转方向
        const MIN_STEP = 0;
        const MAX_STEP = 3;
        const width = this.oldWidth;
        const height = this.oldHeight;

        this.rotateStep = this.rotateStep || 0;
        this.rotateStep += isClockWise ? 1 : -1;
        if (this.rotateStep > MAX_STEP) {
            this.rotateStep = MIN_STEP;
        } else if (this.rotateStep < MIN_STEP) {
            this.rotateStep = MAX_STEP;
        }

        // 计算弧度
        const degree = this.rotateStep * 90 * Math.PI / 180;

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