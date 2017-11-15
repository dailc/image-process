import ImgClip from './clip/clip';
import scaleMixin from './scale/scale';

const ImageProcess = {};

// 所有处理的合集
scaleMixin(ImageProcess);
ImageProcess.ImgClip = ImgClip;

export default ImageProcess;
