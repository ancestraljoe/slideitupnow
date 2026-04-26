import { wrapSlide } from './favorites.js'

function jitter(num) {
    return num + Math.random() * (num * 0.4) - num * 0.2
}

export function createVideoSlide(slide, onSkip, settings, hlsSources) {
    const vidDiv = document.createElement("video")
    vidDiv.className = "videoSlide"
    vidDiv.setAttribute("controls", "true")
    vidDiv.muted = true

    let blobUrl = null
    let timeout = null
    let clickTimer = null

    if (slide.droppedFile) {
        blobUrl = URL.createObjectURL(slide.droppedFile)
        vidDiv.src = blobUrl
        vidDiv.setAttribute("data-is-object", "true")
        vidDiv.currentTime = 0
        vidDiv.play()
    } else if (slide.file) {
        // file is a FileSystemHandle, need async — caller handles this via promise
        vidDiv._pendingFile = slide.file
    } else if (slide.url) {
        vidDiv.src = slide.url
        vidDiv.play()
    } else if (slide.hls) {
        const hls = new Hls()
        hlsSources[slide.hls] = hls
        vidDiv.setAttribute('width', slide.scaledWidth)
        vidDiv.dataset.hlsSrc = slide.hls
        hls.loadSource(slide.hls)
        hls.attachMedia(vidDiv)
        hls.on(Hls.Events.MANIFEST_PARSED, () => vidDiv.play())
    }

    const slideInfo = {
        url: slide.url || slide.hls,
        name: slide.name || slide.droppedFile?.name,
        title: slide.title,
        format: 'video',
        source: slide.url ? 'reddit' : 'local',
        width: slide.width,
        height: slide.height
    }
    const wrapped = wrapSlide(vidDiv, slideInfo)

    // HLS error handler (needs wrapped ref)
    if (slide.hls) {
        hlsSources[slide.hls].on(Hls.Events.ERROR, () => {
            if (timeout) clearTimeout(timeout)
            onSkip(wrapped)
        })
    }

    // Skip function for keyboard nav
    wrapped._skipSlide = () => {
        if (timeout) clearTimeout(timeout)
        onSkip(wrapped)
    }

    // Setup after element is in DOM
    wrapped._setupTimers = () => {
        if (slide.type === 'long') {
            vidDiv.currentTime = slide.start
            timeout = setTimeout(() => onSkip(wrapped), settings.videoSplittingTime * 1000)
        }
    }

    vidDiv.addEventListener("ended", () => {
        if (timeout) clearTimeout(timeout)
        onSkip(wrapped)
    }, false)

    vidDiv.onclick = (e) => {
        e.preventDefault()
        if (clickTimer) {
            clearTimeout(clickTimer)
            clickTimer = null
            if (timeout) clearTimeout(timeout)
            onSkip(wrapped)
        } else {
            clickTimer = setTimeout(() => {
                clickTimer = null
                vidDiv.paused ? vidDiv.play() : vidDiv.pause()
            }, 250)
        }
    }

    // Cleanup function to prevent memory leaks
    wrapped._cleanup = () => {
        if (timeout) { clearTimeout(timeout); timeout = null }
        if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null }
        const hlsKey = vidDiv.dataset?.hlsSrc
        if (hlsKey && hlsSources[hlsKey]) {
            try {
                hlsSources[hlsKey].detachMedia()
                hlsSources[hlsKey].destroy()
            } catch (e) { /* already destroyed */ }
            delete hlsSources[hlsKey]
        }
        vidDiv.pause()
        vidDiv.removeAttribute('src')
        vidDiv.load()
    }

    return wrapped
}

export function createImageSlide(slide, onSkip, settings) {
    const imgDiv = document.createElement("img")
    imgDiv.className = "imgSlide"

    let blobUrl = null
    let timeout = null

    if (slide.droppedFile) {
        blobUrl = URL.createObjectURL(slide.droppedFile)
        imgDiv.src = blobUrl
        imgDiv.setAttribute("data-is-object", "true")
    } else if (slide.file) {
        imgDiv._pendingFile = slide.file
    } else if (slide.url) {
        imgDiv.src = slide.url
    }

    const slideInfo = {
        url: slide.url,
        name: slide.name || slide.droppedFile?.name,
        title: slide.title,
        format: 'image',
        source: slide.url ? 'reddit' : 'local',
        width: slide.width,
        height: slide.height
    }
    const wrapped = wrapSlide(imgDiv, slideInfo)

    wrapped._skipSlide = () => {
        if (timeout) clearTimeout(timeout)
        onSkip(wrapped)
    }

    wrapped._setupTimers = () => {
        timeout = setTimeout(() => onSkip(wrapped), jitter(settings.imageInterval * 1000))
    }

    imgDiv.onclick = () => {
        if (timeout) clearTimeout(timeout)
        onSkip(wrapped)
    }

    wrapped._cleanup = () => {
        if (timeout) { clearTimeout(timeout); timeout = null }
        if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null }
    }

    return wrapped
}

export function createIframeSlide(slide, onSkip, settings, rootHeight) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(slide.html, 'text/html')
    const iframeDiv = doc.body.firstElementChild
    if (!iframeDiv) return null

    let timeout = null

    iframeDiv.setAttribute("width", slide.scaledWidth)
    iframeDiv.setAttribute("height", rootHeight)
    iframeDiv.removeAttribute("style")
    iframeDiv.className = "iframeSlide"

    iframeDiv._skipSlide = () => {
        if (timeout) clearTimeout(timeout)
        onSkip(iframeDiv)
    }

    iframeDiv._setupTimers = () => {
        timeout = setTimeout(() => onSkip(iframeDiv), jitter(settings.imageInterval * 1000))
    }

    iframeDiv.onclick = () => {
        if (timeout) clearTimeout(timeout)
        onSkip(iframeDiv)
    }

    iframeDiv._cleanup = () => {
        if (timeout) { clearTimeout(timeout); timeout = null }
    }

    return iframeDiv
}
