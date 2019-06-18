import { sdk } from ".";

export function openCameraOrGallery(options, cb) {
    return sdk.execute('openCameraOrGallery', options, cb);
}