import { showDirectoryPicker } from 'https://cdn.jsdelivr.net/npm/file-system-access/lib/es2018.js';
import { settings } from './settings.js';
import { shuffle, scaleWidth, IMAGE_REGEX, VIDEO_REGEX } from './utils.js';

let allFiles = [];
let remainingFiles = [];
export let current = 0;
export let total = 100;

export async function showPicker() {
    return await showDirectoryPicker()
}

export async function loadFiles(folder) {
    remainingFiles = []
    allFiles = []
    let videoFiles = []
    await loadFolder(folder, videoFiles)
    const {shortVideos, longVideos} = await loadVideoMetadata(videoFiles)
    allFiles = allFiles.concat(shortVideos)
    allFiles = allFiles.concat(longVideos)
    remainingFiles = [...allFiles]
    shuffle(remainingFiles)
}

export async function loadDroppedFiles(droppedItems) {
    remainingFiles = []
    allFiles = []
    const imageItems = droppedItems.filter(f => f.format === 'image')
    const videoItems = droppedItems.filter(f => f.format === 'video')

    // Images: wrap droppedFile as a fake FileSystemHandle-like object
    for (const item of imageItems) {
        allFiles.push({ type: 'short', droppedFile: item.droppedFile, format: 'image' })
    }

    // Videos: load metadata using File objects directly
    if (videoItems.length > 0) {
        const videoFiles = videoItems.map(v => v.droppedFile)
        const { shortVideos, longVideos } = await loadDroppedVideoMetadata(videoFiles)
        allFiles = allFiles.concat(shortVideos)
        allFiles = allFiles.concat(longVideos)
    }

    remainingFiles = [...allFiles]
    shuffle(remainingFiles)
}

async function loadDroppedVideoMetadata(videoFiles) {
    const longVideos = []
    const shortVideos = []
    const video = document.createElement('video')
    video.preload = 'metadata'
    const files = [...videoFiles]
    total = files.length
    current = 0

    return new Promise((resolve) => {
        video.onloadedmetadata = function() {
            URL.revokeObjectURL(video.src)
            const duration = video.duration
            const width = video.videoWidth || 19
            const height = video.videoHeight || 9
            const file = files.pop()
            if (duration > settings.videoSplittingTime) {
                for (let i = 0; i < Math.ceil(duration / settings.videoSplittingTime); i++) {
                    longVideos.push({ type: 'long', droppedFile: file, start: i * settings.videoSplittingTime, format: 'video', width, height })
                }
            } else {
                shortVideos.push({ type: 'short', droppedFile: file, format: 'video', width, height })
            }
            if (files.length > 0) {
                video.src = URL.createObjectURL(files[files.length - 1])
                current++
            } else {
                resolve({ shortVideos, longVideos })
            }
        }
        video.onerror = function() {
            URL.revokeObjectURL(video.src)
            files.pop()
            if (files.length > 0) {
                video.src = URL.createObjectURL(files[files.length - 1])
                current++
            } else {
                resolve({ shortVideos, longVideos })
            }
        }
        video.src = URL.createObjectURL(files[files.length - 1])
    })
}

export function resetFiles() {
    allFiles = []
    remainingFiles = []
    current = 0
    total = 100
}

export async function restartSlides() {
    remainingFiles = [...allFiles]
    shuffle(remainingFiles)
}

export async function nextFileSlides(remainingWidth, height) {
    await loadImageMetadata();
    let toAdd = [];
    let newRemainingWidth = remainingWidth;
    let indicesToRemove = [];
    for (let i = remainingFiles.length - 1; i >= remainingFiles.length - 10 && i >= 0; i--) {
        let scaledWidth = scaleWidth(height, remainingFiles[i].height, remainingFiles[i].width)
        remainingFiles[i].scaledWidth = scaledWidth
        if (scaledWidth < newRemainingWidth) {
            toAdd.push(remainingFiles[i])
            indicesToRemove.push(i)
            newRemainingWidth -= scaledWidth
        }
    }
    for (const i of indicesToRemove) {
        remainingFiles.splice(i, 1)
    }
    return toAdd
}

async function loadFolder(folder, videoFiles) {
    let files = await folder.values()
    for await (const file of files) {
        if (file.kind == 'directory') {
            await loadFolder(file, videoFiles)
        } else if (IMAGE_REGEX.test(file.name)) {
            allFiles.push({type: 'short', file: file, format: 'image'})
        } else if (VIDEO_REGEX.test(file.name)) {
            videoFiles.push(file)
        }
    }
}

async function loadVideoMetadata(videoFiles) {
    if (videoFiles.length == 0) {
        return {shortVideos: [], longVideos: []}
    }
    const longVideos = []
    const shortVideos = []
    const video = document.createElement('video');
    video.preload = 'metadata';
    total = videoFiles.length
    current = 0

    return new Promise(async(resolve) => {

        video.onloadedmetadata = async function() {
            window.URL.revokeObjectURL(video.src);
            let duration = video.duration;
            let width = video.videoWidth;
            let height = video.videoHeight;
            if (!width || !height) { // assume 19:9 ratio
                width = 19
                height = 9
            }
            if (duration > settings.videoSplittingTime) {
                const videoFile = videoFiles.pop()
                for (let i = 0; i < Math.ceil(duration/settings.videoSplittingTime); i++) {
                    longVideos.push({type: 'long', file: videoFile, start: i*settings.videoSplittingTime, format: 'video', width: width, height: height})
                }
            } else {
                shortVideos.push({type: 'short', file: videoFiles.pop(), format: 'video', width: width, height: height})
            }
            if (videoFiles.length > 0) {
                video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile())
                current++;
            } else {
                resolve({shortVideos, longVideos})
            }
        }

        video.onerror = async function(e) {
            URL.revokeObjectURL(video.src)
            videoFiles.pop();
            if (videoFiles.length > 0) {
                video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile())
                current++;
            } else {
                resolve({shortVideos, longVideos})
            }
        }

        video.src = URL.createObjectURL(await videoFiles[videoFiles.length - 1].getFile());
    })
}

async function getFileBlob(item) {
    if (item.droppedFile) return item.droppedFile
    return await item.file.getFile()
}

async function loadImageMetadata() {
    let img = new Image();
    let imageObjectsToLoad = []
    for (let i = remainingFiles.length - 1; i >= remainingFiles.length - 10 && i >= 0; i--) {
        if (!remainingFiles[i].width && remainingFiles[i].format == 'image') {
            imageObjectsToLoad.push(remainingFiles[i])
        }
    }
    if (imageObjectsToLoad.length > 0) {
        return new Promise(async(resolve) => {
            let currentImageObject;
            let attempts = 0;

            img.onload = async function() {
                attempts = 0
                currentImageObject.width = img.width
                currentImageObject.height = img.height
                URL.revokeObjectURL(img.src);
                if (imageObjectsToLoad.length > 0) {
                    currentImageObject = imageObjectsToLoad.pop()
                    img.src = URL.createObjectURL(await getFileBlob(currentImageObject))
                } else {
                    resolve()
                }
            };
            img.onerror = async function(e) {
                console.error(e, attempts)
                URL.revokeObjectURL(img.src)
                if (attempts++ < 3) {
                    img.src = URL.createObjectURL(await getFileBlob(currentImageObject))
                } else {
                    attempts = 0
                    currentImageObject.width = 1
                    currentImageObject.height = 1
                    if (imageObjectsToLoad.length > 0) {
                        currentImageObject = imageObjectsToLoad.pop()
                        img.src = URL.createObjectURL(await getFileBlob(currentImageObject))
                    } else {
                        resolve()
                    }
                }
            }

            currentImageObject = imageObjectsToLoad.pop()
            img.src = URL.createObjectURL(await getFileBlob(currentImageObject));
        })

    }
}


// scaleWidth imported from utils.js