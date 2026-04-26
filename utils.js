// Fisher-Yates shuffle — shared utility
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// Shared file type regex
export const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i
export const VIDEO_REGEX = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|3gp)$/i

// Scale width to fit a target height while preserving aspect ratio
export function scaleWidth(fitHeight, height, width) {
    return width * (fitHeight / height)
}
