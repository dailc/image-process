import ImgClip from '../clip/clip';

export default function clipMixin(ImageProcess) {
    const api = ImageProcess;
    
    api.ImgClip = ImgClip;
}
