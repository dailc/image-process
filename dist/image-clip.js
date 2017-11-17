/*!
 * image-process v0.0.1
 * (c) 2017-2017 dailc
 * Released under the MIT License.
 * https://github.com/dailc/image-process
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.ImageClip = factory());
}(this, (function () { 'use strict';

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
function selector(element) {
    var target = element;

    if (typeof target === 'string') {
        target = document.querySelector(target);
    }

    return target;
}

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

/**
 * 加入系统判断功能
 */
function osMixin(hybrid) {
    var hybridJs = hybrid;
    var detect = function detect(ua) {
        this.os = {};

        var android = ua.match(/(Android);?[\s/]+([\d.]+)?/);

        if (android) {
            this.os.android = true;
            this.os.version = android[2];
            this.os.isBadAndroid = !/Chrome\/\d/.test(window.navigator.appVersion);
        }

        var iphone = ua.match(/(iPhone\sOS)\s([\d_]+)/);

        if (iphone) {
            this.os.ios = true;
            this.os.iphone = true;
            this.os.version = iphone[2].replace(/_/g, '.');
        }

        var ipad = ua.match(/(iPad).*OS\s([\d_]+)/);

        if (ipad) {
            this.os.ios = true;
            this.os.ipad = true;
            this.os.version = ipad[2].replace(/_/g, '.');
        }

        // quickhybrid的容器
        var quick = ua.match(/QuickHybrid/i);

        if (quick) {
            this.os.quick = true;
        }

        // epoint的容器
        var ejs = ua.match(/EpointEJS/i);

        if (ejs) {
            this.os.ejs = true;
        }

        var dd = ua.match(/DingTalk/i);

        if (dd) {
            this.os.dd = true;
        }

        // 如果ejs和钉钉以及quick都不是，则默认为h5
        if (!ejs && !dd && !quick) {
            this.os.h5 = true;
        }
    };

    detect.call(hybridJs, navigator.userAgent);
}

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * ios手机竖拍时会旋转，需要外部引入exif去主动旋转
 */

var defaultetting = {
    container: '#imgclip',
    // 必须是一个image对象
    img: null,
    // 是否开启平滑
    isSmooth: true,
    // 放大镜捕获的图像半径
    captureRadius: 30,
    // 移动矩形框时的最小间距
    minMoveDiff: 1,
    // 压缩质量
    quality: 0.92,
    mime: 'image/jpeg',
    // 限制canvas显示的最大高度（不是实际高度，是css显示的最大高度）
    // 单位是像素，不传的话不限制
    maxCssHeight: 0,
    // 大小提示框的风格，0-点击时显示，1-恒显示，-1-永不显示
    sizeTipsStyle: 0,
    // 压缩时的放大系数，默认为1，如果增大，代表图像的尺寸会变大(最大不会超过原图)
    compressScaleRatio: 1,
    // ios的iPhone下主动放大一定系数以解决分辨率过小的模糊问题
    iphoneFixedRatio: 2,
    // 是否采用原图像素（不会压缩）
    isUseOriginSize: false,
    // 增加最大宽度，增加后最大不会超过这个宽度
    maxWidth: 0,
    // 使用强制的宽度，如果使用，其它宽高比系数都会失效，默认整图使用这个宽度
    forceWidth: 0,
    // 同上，但是一般不建议设置，因为很可能会改变宽高比导致拉升，特殊场景下使用
    forceHeight: 0
};

var ImgClip$1 = function () {
    /**
     * 构造函数
     * @param {Object} options 配置信息
     * @constructor
     */
    function ImgClip(options) {
        _classCallCheck(this, ImgClip);

        osMixin(this);
        this.options = extend({}, defaultetting, options);
        this.container = selector(this.options.container);
        this.img = this.options.img;
        this.domChildren = [];
        this.events = {};

        this.initCanvas();
        this.initClip();
        this.initMagnifier();
        this.initTransferCanvas();
        this.resetClipRect();
    }

    /**
     * 获取devicePixelRatio(像素比)
     * canvas绘制时乘以缩放系数，防止裁剪不清晰
     * （譬如320的手机上可能裁剪出来的就是640-系数是2）
     */


    _createClass(ImgClip, [{
        key: 'getPixelRatio',
        value: function getPixelRatio(context) {
            // 注意，backingStorePixelRatio属性已弃用
            var backingStore = context.backingStorePixelRatio || context.webkitBackingStorePixelRatio || context.mozBackingStorePixelRatio || context.msBackingStorePixelRatio || context.oBackingStorePixelRatio || context.backingStorePixelRatio || 1;

            var ratio = (window.devicePixelRatio || 1) / backingStore;

            ratio *= this.options.compressScaleRatio || 1;
            if (this.os.ios && this.os.iphone) {
                ratio *= this.options.iphoneFixedRatio || 1;
            }

            return ratio;
        }
    }, {
        key: 'clear',
        value: function clear() {
            var lenD = this.domChildren && this.domChildren.length || 0;

            for (var i = 0; i < lenD; i += 1) {
                this.container.removeChild(this.domChildren[i]);
            }
            this.domChildren = null;

            var allEventNames = Object.keys(this.events || {});
            var lenE = allEventNames && allEventNames.length || 0;

            for (var _i = 0; _i < lenE; _i += 1) {
                this.container.removeEventListener(allEventNames[_i], this.events[allEventNames[_i]]);
            }
            this.events = null;
        }
    }, {
        key: 'initCanvas',
        value: function initCanvas() {
            this.canvasFull = document.createElement('canvas');
            this.ctxFull = this.canvasFull.getContext('2d');
            this.canvasFull.className = 'clip-canvas-full';
            this.smoothCtx(this.ctxFull);

            // 实际的像素比，绘制时基于这个比例绘制
            this.RATIO_PIXEL = this.getPixelRatio(this.ctxFull);
            // 获取图片的宽高比
            var wPerH = this.img.width / this.img.height;
            var oldWidth = this.container.offsetWidth || window.innerWidth;

            this.oldWidth = oldWidth;
            this.oldHeight = oldWidth / wPerH;
            this.resizeCanvas(oldWidth, this.oldHeight);
            this.container.appendChild(this.canvasFull);
            this.domChildren.push(this.canvasFull);
        }
    }, {
        key: 'resizeCanvas',
        value: function resizeCanvas(width, height) {
            var maxCssHeight = this.options.maxCssHeight;
            var wPerH = width / height;
            var legalWidth = this.oldWidth;
            var legalHeight = legalWidth / wPerH;

            if (maxCssHeight && legalHeight > maxCssHeight) {
                legalHeight = maxCssHeight;
                legalWidth = legalHeight * wPerH;
            }
            this.marginLeft = (this.oldWidth - legalWidth) / 2;

            this.canvasFull.style.width = legalWidth + 'px';
            this.canvasFull.style.height = legalHeight + 'px';
            this.canvasFull.style.marginLeft = this.marginLeft + 'px';
            this.canvasFull.width = legalWidth * this.RATIO_PIXEL;
            this.canvasFull.height = legalHeight * this.RATIO_PIXEL;

            if (this.rotateStep & 1) {
                this.scale = this.canvasFull.width / this.img.height;
            } else {
                this.scale = this.canvasFull.width / this.img.width;
            }
        }
    }, {
        key: 'initClip',
        value: function initClip() {
            var clipRect = document.createElement('div');

            clipRect.className = 'clip-rect';

            this.clipRect = clipRect;
            this.container.appendChild(this.clipRect);
            this.domChildren.push(this.clipRect);

            // 添加tips
            var clipTips = document.createElement('span');

            clipTips.className = 'clip-tips';
            this.clipRect.appendChild(clipTips);
            this.clipTips = clipTips;

            if (this.options.sizeTipsStyle === -1 || this.options.sizeTipsStyle === 0) {
                // clipTips,canvas之外的
                this.clipTips.classList.add('clip-hidden');
            }

            this.clipRectHorns = [];
            // 添加8个角
            for (var i = 0; i < 8; i += 1) {
                var spanHorn = document.createElement('span');

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

            this.resizeClip();
        }
    }, {
        key: 'resizeClip',
        value: function resizeClip() {
            this.listenerHornsResize();
            this.listenerRectMove();
            this.listenerContainerLeave();
        }
    }, {
        key: 'listenerHornsResize',
        value: function listenerHornsResize() {
            var _this = this;

            this.clipEventState = {};

            var saveEventState = function saveEventState(e) {
                _this.clipEventState.width = _this.clipRect.offsetWidth;
                _this.clipEventState.height = _this.clipRect.offsetHeight;
                _this.clipEventState.left = _this.clipRect.offsetLeft - _this.marginLeft;
                _this.clipEventState.top = _this.clipRect.offsetTop;
                _this.clipEventState.mouseX = e.touches ? e.touches[0].pageX : e.pageX;
                _this.clipEventState.mouseY = e.touches ? e.touches[0].pageY : e.pageY;
                _this.clipEventState.evnt = e;
            };
            var getCurXY = function getCurXY(mouseX, mouseY) {
                // 父容器的top和left也要减去
                var curY = mouseY - _this.canvasFull.offsetTop - _this.container.offsetTop;
                var curX = mouseX - _this.canvasFull.offsetLeft - _this.container.offsetLeft;

                curY = Math.min(curY, _this.canvasFull.offsetHeight);
                curY = Math.max(0, curY);
                curX = Math.min(curX, _this.canvasFull.offsetWidth);
                curX = Math.max(0, curX);

                _this.curX = curX;
                _this.curY = curY;

                return {
                    curX: curX,
                    curY: curY
                };
            };
            this.getCurXY = getCurXY;

            var moving = function moving(e) {
                if (!_this.canResizing) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                var clipEventState = _this.clipEventState;
                var target = clipEventState.evnt.target;
                // 区分pageX与clientX
                var mouseY = e.touches ? e.touches[0].pageY : e.pageY;
                var mouseX = e.touches ? e.touches[0].pageX : e.pageX;
                var curCooidinate = getCurXY(mouseX, mouseY);
                var curX = curCooidinate.curX;
                var curY = curCooidinate.curY;
                var width = void 0;
                var height = void 0;
                var left = void 0;
                var top = void 0;

                if (target.classList.contains('horn-nw')) {
                    width = clipEventState.width - (curX - clipEventState.left);
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = curX;
                    top = curY;
                } else if (target.classList.contains('horn-ne')) {
                    width = curX - clipEventState.left;
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = clipEventState.left;
                    top = curY;
                } else if (target.classList.contains('horn-sw')) {
                    width = clipEventState.width - (curX - clipEventState.left);
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
                    height = clipEventState.height - (curY - clipEventState.top);
                    left = clipEventState.left;
                    top = curY;
                } else if (target.classList.contains('horn-s')) {
                    width = clipEventState.width;
                    height = curY - clipEventState.top;
                    left = clipEventState.left;
                    top = clipEventState.top;
                } else if (target.classList.contains('horn-w')) {
                    width = clipEventState.width - (curX - clipEventState.left);
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
                _this.clipRect.style.left = left + _this.marginLeft + 'px';
                _this.clipRect.style.top = top + 'px';
                _this.clipRect.style.width = width + 'px';
                _this.clipRect.style.height = height + 'px';
                _this.draw();
            };

            this.container.addEventListener('touchmove', moving);
            this.container.addEventListener('mousemove', moving);

            this.events.touchmove = moving;
            this.events.mousemove = moving;

            var startResize = function startResize(e) {
                _this.canResizing = true;
                _this.canvasMag.classList.remove('clip-hidden');
                if (_this.options.sizeTipsStyle === 0) {
                    _this.clipTips.classList.remove('clip-hidden');
                }
                saveEventState(e);
            };
            var endResize = function endResize() {
                _this.canResizing = false;
                _this.canvasMag.classList.add('clip-hidden');
                if (_this.options.sizeTipsStyle === 0) {
                    _this.clipTips.classList.add('clip-hidden');
                }
            };

            this.endHronsResize = endResize;

            for (var i = 0; i < 8; i += 1) {
                this.clipRectHorns[i].addEventListener('mousedown', startResize);
                this.clipRectHorns[i].addEventListener('touchstart', startResize);

                this.clipRectHorns[i].addEventListener('mouseup', endResize);
                this.clipRectHorns[i].addEventListener('touchend', endResize);
            }
        }
    }, {
        key: 'listenerRectMove',
        value: function listenerRectMove() {
            var _this2 = this;

            var rectDom = this.clipRect;

            var moving = function moving(e) {
                if (_this2.canResizing || !_this2.canMove) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                var MIN_DIFF = _this2.options.minMoveDiff;
                var mouseY = e.touches ? e.touches[0].pageY : e.pageY;
                var mouseX = e.touches ? e.touches[0].pageX : e.pageX;

                var diffX = mouseX - _this2.prevRectMouseX;
                var diffY = mouseY - _this2.prevRectMouseY;

                if (!diffX && !diffY) {
                    return;
                }

                if (Math.abs(diffX) > MIN_DIFF || Math.abs(diffY) > MIN_DIFF) {
                    _this2.prevRectMouseX = mouseX;
                    _this2.prevRectMouseY = mouseY;
                }

                var top = rectDom.offsetTop + diffY;
                var left = rectDom.offsetLeft + diffX;

                if (top < 0) {
                    top = 0;
                } else if (top > _this2.canvasFull.offsetHeight - rectDom.offsetHeight) {
                    top = _this2.canvasFull.offsetHeight - rectDom.offsetHeight;
                }

                if (left < _this2.marginLeft) {
                    left = _this2.marginLeft;
                } else if (left > _this2.canvasFull.offsetWidth - rectDom.offsetWidth + _this2.marginLeft) {
                    left = _this2.canvasFull.offsetWidth - rectDom.offsetWidth + _this2.marginLeft;
                }

                // 这里无须再补上marginLeft
                _this2.clipRect.style.left = left + 'px';
                _this2.clipRect.style.top = top + 'px';
                _this2.draw();
            };

            rectDom.addEventListener('touchmove', moving);
            rectDom.addEventListener('mousemove', moving);

            var startMove = function startMove(e) {
                _this2.canMove = true;

                var mouseY = e.touches ? e.touches[0].pageY : e.pageY;
                var mouseX = e.touches ? e.touches[0].pageX : e.pageX;

                _this2.prevRectMouseX = mouseX;
                _this2.prevRectMouseY = mouseY;
            };

            var endMove = function endMove() {
                _this2.canMove = false;
            };

            this.endRectMove = endMove;

            rectDom.addEventListener('mousedown', startMove);
            rectDom.addEventListener('touchstart', startMove);

            rectDom.addEventListener('mouseup', endMove);
            rectDom.addEventListener('touchend', endMove);
        }
    }, {
        key: 'listenerContainerLeave',
        value: function listenerContainerLeave() {
            var _this3 = this;

            var leaveContainer = function leaveContainer() {
                if (_this3.canResizing) {
                    _this3.endHronsResize();
                }
                if (_this3.canMove) {
                    _this3.endRectMove();
                }
            };

            this.container.addEventListener('mouseleave', leaveContainer);
            this.container.addEventListener('mouseup', leaveContainer);
            this.events.mouseleave = leaveContainer;
            this.events.mouseup = leaveContainer;
        }
    }, {
        key: 'draw',
        value: function draw() {
            // 放大镜
            this.drawMag();
            var realImgSize = this.getRealFinalImgSize(this.clipRect.offsetWidth * this.RATIO_PIXEL, this.clipRect.offsetHeight * this.RATIO_PIXEL);
            var curWidth = realImgSize.width;
            var curHeight = realImgSize.height;

            this.clipTips.innerText = curWidth.toFixed(0) + '*' + curHeight.toFixed(0);

            this.ctxFull.save();
            if (this.rotateStep & 1) {
                this.ctxFull.clearRect(0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.clearRect(0, 0, this.canvasFull.width, this.canvasFull.height);
            }

            this.drawImage();
            this.drawMask();

            this.ctxFull.beginPath();

            var params = this.getClipRectParams();
            var srcX = params.srcX;
            var srcY = params.srcY;
            var sWidth = params.sWidth;
            var sHeight = params.sHeight;

            this.ctxFull.rect(srcX, srcY, sWidth, sHeight);
            this.ctxFull.clip();
            this.drawImage();
            this.ctxFull.restore();
        }
    }, {
        key: 'getClipRectParams',
        value: function getClipRectParams() {
            var offsetTop = this.clipRect.offsetTop;
            // 减去margin才是真实的
            var offsetLeft = this.clipRect.offsetLeft - this.marginLeft;
            var offsetWidth = this.clipRect.offsetWidth;
            var offsetHeight = this.clipRect.offsetHeight;
            var offsetRight = offsetLeft + offsetWidth;
            var offsetBottom = offsetTop + offsetHeight;

            var srcX = offsetLeft;
            var srcY = offsetTop;
            var sWidth = offsetWidth;
            var sHeight = offsetHeight;

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
                srcX: srcX,
                srcY: srcY,
                sWidth: sWidth,
                sHeight: sHeight
            };
        }
    }, {
        key: 'getRealCoordinate',
        value: function getRealCoordinate(mouseX, mouseY) {
            // 获取真实坐标系（旋转缩放后的）
            var x = mouseX;
            var y = mouseY;

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
                x: x,
                y: y
            };
        }
    }, {
        key: 'drawImage',
        value: function drawImage() {
            // 宽高在旋转不同的情况下是颠倒的
            if (this.rotateStep & 1) {
                this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height, 0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.drawImage(this.img, 0, 0, this.img.width, this.img.height, 0, 0, this.canvasFull.width, this.canvasFull.height);
            }
        }
    }, {
        key: 'drawMask',
        value: function drawMask() {
            this.ctxFull.save();

            this.ctxFull.fillStyle = 'rgba(0, 0, 0, 0.3)';
            if (this.rotateStep & 1) {
                this.ctxFull.fillRect(0, 0, this.canvasFull.height, this.canvasFull.width);
            } else {
                this.ctxFull.fillRect(0, 0, this.canvasFull.width, this.canvasFull.height);
            }

            this.ctxFull.restore();
        }
    }, {
        key: 'drawMag',
        value: function drawMag() {
            var captureRadius = this.options.captureRadius;
            var centerPoint = this.getRealCoordinate(this.curX, this.curY);
            var sWidth = captureRadius * 2;
            var sHeight = captureRadius * 2;
            var srcX = centerPoint.x - captureRadius;
            var srcY = centerPoint.y - captureRadius;

            if (this.rotateStep & 1) {
                this.ctxMag.clearRect(0, 0, this.canvasMag.height, this.canvasMag.width);
            } else {
                this.ctxMag.clearRect(0, 0, this.canvasMag.width, this.canvasMag.height);
            }

            var drawX = 0;
            var drawY = 0;

            if (this.os.ios) {
                // 兼容ios的Safari不能绘制srcX,srcY为负的情况
                if (srcY < 0) {
                    // 注意先后顺序
                    drawY = this.canvasMag.height / 2 * Math.abs(srcY / captureRadius);
                    srcY = 0;
                }
                if (srcX < 0) {
                    // 注意先后顺序
                    drawX = this.canvasMag.width / 2 * Math.abs(srcX / captureRadius);
                    srcX = 0;
                }
            }

            // 生成新的图片,内部坐标会使用原图片的尺寸
            this.ctxMag.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, drawX, drawY, this.canvasMag.width, this.canvasMag.height);

            var centerX = this.canvasMag.width / 2;
            var centerY = this.canvasMag.height / 2;
            var radius = 5 * this.RATIO_PIXEL;

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
    }, {
        key: 'initMagnifier',
        value: function initMagnifier() {
            this.canvasMag = document.createElement('canvas');
            this.canvasMag.className = 'magnifier clip-hidden';
            this.ctxMag = this.canvasMag.getContext('2d');
            this.smoothCtx(this.ctxMag);
            this.container.appendChild(this.canvasMag);
            this.domChildren.push(this.canvasMag);

            // 需要初始化一个高度，否则如果旋转时会造不对
            // 捕获直径*像素比
            this.canvasMag.width = this.options.captureRadius * 2 * this.RATIO_PIXEL;
            this.canvasMag.height = this.options.captureRadius * 2 * this.RATIO_PIXEL;
        }
    }, {
        key: 'initTransferCanvas',
        value: function initTransferCanvas() {
            this.canvasTransfer = document.createElement('canvas');
            this.canvasTransfer.style.display = 'none';
            this.canvasTransfer.className = 'transfer-canvas';
            this.ctxTransfer = this.canvasTransfer.getContext('2d');
            this.smoothCtx(this.ctxTransfer);
            this.container.appendChild(this.canvasTransfer);
            this.domChildren.push(this.canvasTransfer);
        }
    }, {
        key: 'smoothCtx',
        value: function smoothCtx(ctx) {
            var isSmooth = this.options.isSmooth;

            ctx.mozImageSmoothingEnabled = isSmooth;
            ctx.webkitImageSmoothingEnabled = isSmooth;
            ctx.msImageSmoothingEnabled = isSmooth;
            ctx.imageSmoothingEnabled = isSmooth;
        }
    }, {
        key: 'getRealFinalImgSize',
        value: function getRealFinalImgSize(curWidth, curHeight) {
            var wPerH = this.canvasFull.width / this.canvasFull.height;
            var maxWidth = this.options.maxWidth || 0;
            var forceWidth = this.options.forceWidth || 0;
            var forceHeight = this.options.forceHeight || 0;
            var width = curWidth;
            var height = curHeight;

            if (this.rotateStep & 1) {
                if (this.options.isUseOriginSize || this.canvasFull.width > this.img.height) {
                    // 最大不会超过原图的尺寸
                    width = this.img.width * curWidth / this.canvasFull.height;
                    height = this.img.height * curHeight / this.canvasFull.width;
                }
                if (maxWidth && this.canvasFull.height > maxWidth && maxWidth < this.img.height) {
                    // 使用最大宽，前提是原始大小也大于最大宽
                    width = maxWidth * curWidth / this.canvasFull.height;
                    height = maxWidth / wPerH * curHeight / this.canvasFull.width;
                }
                if (forceWidth) {
                    // 使用固定宽
                    width = forceWidth * curWidth / this.canvasFull.height;
                    height = (forceHeight || forceWidth / wPerH) * curHeight / this.canvasFull.width;
                }
            } else {
                if (this.options.isUseOriginSize || this.canvasFull.width > this.img.width) {
                    // 最大不会超过原图的尺寸
                    width = this.img.width * curWidth / this.canvasFull.width;
                    height = this.img.height * curHeight / this.canvasFull.height;
                }
                if (maxWidth && this.canvasFull.width > maxWidth && maxWidth < this.img.width) {
                    width = maxWidth * curWidth / this.canvasFull.width;
                    height = maxWidth / wPerH * curHeight / this.canvasFull.height;
                }
                if (forceWidth) {
                    // 使用固定宽
                    width = forceWidth * curWidth / this.canvasFull.width;
                    height = (forceHeight || forceWidth / wPerH) * curHeight / this.canvasFull.height;
                }
            }

            return {
                width: width,
                height: height
            };
        }

        /**
         * 裁剪
         */

    }, {
        key: 'clip',
        value: function clip() {
            var params = this.getClipRectParams();
            var srcX = params.srcX;
            var srcY = params.srcY;
            var sWidth = params.sWidth;
            var sHeight = params.sHeight;
            var realImgSize = this.getRealFinalImgSize(sWidth, sHeight);
            var curWidth = realImgSize.width;
            var curHeight = realImgSize.height;

            // 注意，这个变量可能不存在，会影响判断的，所以要确保它存在
            this.rotateStep = this.rotateStep || 0;

            // 计算弧度
            var degree = this.rotateStep * 90 * Math.PI / 180;

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
                this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, 0, 0, this.canvasTransfer.height, this.canvasTransfer.width);
            } else {
                this.ctxTransfer.drawImage(this.img, srcX / this.scale, srcY / this.scale, sWidth / this.scale, sHeight / this.scale, 0, 0, this.canvasTransfer.width, this.canvasTransfer.height);
            }

            this.clipImgData = this.canvasTransfer.toDataURL(this.options.mime, this.options.quality);
        }
    }, {
        key: 'resetClipRect',
        value: function resetClipRect() {
            this.clipRect.style.left = (this.marginLeft || 0) + 'px';
            this.clipRect.style.top = 0;
            this.clipRect.style.width = this.canvasFull.width / this.RATIO_PIXEL + 'px';
            this.clipRect.style.height = this.canvasFull.height / this.RATIO_PIXEL + 'px';
            this.draw();
        }
    }, {
        key: 'getClipImgData',
        value: function getClipImgData() {
            return this.clipImgData;
        }
    }, {
        key: 'rotate',
        value: function rotate(isClockWise) {
            // 最小和最大旋转方向
            var MIN_STEP = 0;
            var MAX_STEP = 3;
            var width = this.oldWidth;
            var height = this.oldHeight;

            this.rotateStep = this.rotateStep || 0;
            this.rotateStep += isClockWise ? 1 : -1;
            if (this.rotateStep > MAX_STEP) {
                this.rotateStep = MIN_STEP;
            } else if (this.rotateStep < MIN_STEP) {
                this.rotateStep = MAX_STEP;
            }

            // 计算弧度
            var degree = this.rotateStep * 90 * Math.PI / 180;

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

            this.resetClipRect();
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.clear();
            this.canvasFull = null;
            this.ctxFull = null;
            this.canvasTransfer = null;
            this.ctxTransfer = null;
            this.canvasMag = null;
            this.ctxMag = null;
            this.clipRect = null;
        }
    }]);

    return ImgClip;
}();

return ImgClip$1;

})));
