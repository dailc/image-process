# Image-Scale

图像的缩放

单独打包为`img-scale`模块

## 示例

[https://dailc.github.io/image-process/examples/scale.html](https://dailc.github.io/image-process/examples/scale.html)

## 引入

```js
dist/image-scale.js
```

全局变量

```js
ImageScale
```

调用方法

```js
ImageScale.method()
```

## API

### scaleImageData

对`ImageData`类型的数据进行缩放，将数据放入新的`ImageData`中

```js
ImageScale.scaleImageData(imageData, newImageData, {
    // 0: nearestNeighbor
    // 1: bilinearInterpolation
    // 2: bicubicInterpolation
    // 3: bicubicInterpolation2
    processType: 0,
});
```

__参数说明__

| 参数 | 参数类型 | 说明 |
| :------------- |:-------------:|:-------------|
| imageData | ImageData | 源图像数据 |
| newImageData | ImageData | 新的图像数据-最终结果 |
| args.processType | Number | 处理算法类别，默认为`1`，分别代表三种经典缩放算法 |

### scaleImage

对`Image`类型的对象进行缩放，返回一个`base64`字符串

```js
var base64 = ImageScale.scaleImage(image, {
    width: 80,
    height: 80,
    mime: 'image/png',
    // 0: nearestNeighbor
    // 1: bilinearInterpolation
    // 2: bicubicInterpolation
    // 3: bicubicInterpolation2
    processType: 0,
});
```

__参数说明__

| 参数 | 参数类型 | 说明 |
| :------------- |:-------------:|:-------------|
| image | Image | 源图像 |
| args.processType | Number | 处理算法类别，默认为`1`，分别代表三种经典缩放算法 |
| args.mime | String | `mime`类型，默认为`image/png` |
| args.width | Number | 结果图像的宽 |
| args.height | Number | 结果图像的高 |

__参数说明__

| 参数 | 参数类型 | 说明 |
| :------------- |:-------------:|:-------------|
| base64 | String | 缩放后图像的`base64`字符串 |