import { initSettings, settings, setIsPaused } from './settings.js';
import { showPicker, loadFiles, loadDroppedFiles, nextFileSlides, current, total, restartSlides, resetFiles } from './localFiles.js';
import { initDragDrop } from './dragdrop.js';
import { startReddit, nextRedditSlides, initReddit, resetReddit } from './reddit.js';

const DEBOUNCE_MS = 100;

let inProgress = false;
let slidesFetcher;
let slidesRestarter;
let hlsSources = {};

function showLoader(text) {
    const container = document.getElementById("load-container")
    const loadText = document.getElementById("load-text")
    if (loadText) loadText.textContent = text || "Loading..."
    container.style.display = 'flex'
}

function hideLoader() {
    document.getElementById("load-container").style.display = 'none'
}

async function openDir2() {
    try {
        const folder = await showPicker()
        for (const e of document.getElementsByClassName("titleContent")) {
            e.style.display = 'none'
        }
        showLoader("Loading files...")
        await loadFiles(folder)
        inProgress = true
        slidesFetcher = nextFileSlides
        slidesRestarter = restartSlides
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
        hideLoader()
    } catch(e) {
        console.log(e)
        hideLoader()
    }
}

async function openReddit() {
    showLoader("Loading from Reddit...")
    if(await startReddit()) {
        for (const e of document.getElementsByClassName("titleContent")) {
            e.style.display = 'none'
        }
        hideLoader()
        inProgress = true
        slidesFetcher = nextRedditSlides
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
    } else {
        hideLoader()
        for (const e of document.getElementsByClassName("noForm")) {
            e.style.display = null
        }
    }
}

function jitter(num) {
    let amount = Math.random()*(num*0.4) - num*0.2
    return num + amount
}

function disposeResources(elem) {
    if (elem.dataset.isObject) {
        URL.revokeObjectURL(elem.src)
    } else if (elem.dataset.hlsSrc) {
        let hlsObj = hlsSources[elem.dataset.hlsSrc];
        if (hlsObj) {
            hlsObj.detachMedia()
            hlsObj.destroy()
            delete hlsSources[elem.dataset.hlsSrc]
        }
    }
}

function disposeAllResources() {
    for (const key of Object.keys(hlsSources)) {
        try {
            hlsSources[key].detachMedia()
            hlsSources[key].destroy()
        } catch(e) {}
    }
    hlsSources = {}
    for (const row of document.getElementsByClassName("slideshow-row")) {
        for (const child of Array.from(row.children)) {
            disposeResources(child)
        }
        row.textContent = ""
    }
}

function goHome() {
    if (!inProgress) return
    disposeAllResources()
    inProgress = false
    setIsPaused(false)
    slidesFetcher = null
    slidesRestarter = null
    resetFiles()
    resetReddit()

    const pauseBtn = document.getElementById("pauseAll")
    if (pauseBtn) {
        pauseBtn.querySelector('.btn-label').textContent = "Pause"
        pauseBtn.querySelector('.btn-icon').textContent = '\u23F8'
    }

    document.getElementById("slideshow-grid").style.display = 'none'
    document.getElementById("welcome").style.display = 'flex'
    document.getElementById("redditForm").style.display = 'none'
    for (const e of document.getElementsByClassName("titleContent")) {
        e.style.display = null
    }
    for (const e of document.getElementsByClassName("noForm")) {
        e.style.display = null
    }
}

function replaceSlide(parent, newElem, oldElem, newWidth){
    let oldWidth;
    if (oldElem && Array.prototype.indexOf.call(parent.children, oldElem) >= 0) {
        oldWidth = oldElem.offsetWidth
        newElem.style.width = oldWidth
        parent.replaceChild(newElem, oldElem)
        disposeResources(oldElem)
    } else {
        oldWidth = 0
        parent.appendChild(newElem)
    }
    newElem.setAttribute("data-real-width", newWidth)
    newElem.animate([
        { width: oldWidth + "px" },
        { width: newWidth + "px" }
    ], 500)
}

function parseIframe(htmlString) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')
    return doc.body.firstElementChild
}

async function startSlideShow(root) {

    document.getElementById("welcome").style.display = 'none';
    document.getElementById("slideshow-grid").style.display = 'flex';
    for(const elem of document.getElementsByClassName("slideshow-row")) {
        elem.style.display = 'flex';
    }
    let debounceTimer;
    let toRemove = [];

    async function loadMoreSlides() {
        if (!inProgress) return
        let removedWidth = 0;
        for(const e of toRemove) {
            removedWidth += e.offsetWidth
        }
        let childrenWidth = 0;
        for (const child of root.children) {
            childrenWidth += parseInt(child.dataset.realWidth)
        }
        let usedWidth = childrenWidth - removedWidth;
        let slides = await slidesFetcher(root.offsetWidth - usedWidth, root.offsetHeight, usedWidth < 50)
        if (usedWidth < 50 && slides.length == 0 && slidesRestarter) {
            slidesRestarter()
            slides = await slidesFetcher(root.offsetWidth - usedWidth, root.offsetHeight, usedWidth < 50)
        }
        for (const slide of slides) {
            if (slide.format == 'video') {
                let vidDiv = document.createElement("video")
                vidDiv.className = "videoSlide"
                vidDiv.setAttribute("controls", "true")
                vidDiv.muted = true
                if (slide.droppedFile) {
                    vidDiv.src = URL.createObjectURL(slide.droppedFile)
                    vidDiv.setAttribute("data-is-object", "true")
                    vidDiv.currentTime = 0
                    vidDiv.play()
                } else if (slide.file) {
                    vidDiv.src = URL.createObjectURL(await slide.file.getFile())
                    vidDiv.setAttribute("data-is-object", "true")
                    vidDiv.currentTime = 0
                    vidDiv.play()
                } else if (slide.url) {
                    vidDiv.src = slide.url
                    vidDiv.play()
                } else if (slide.hls) {
                    var hls = new Hls();
                    hlsSources[slide.hls] = hls
                    vidDiv.setAttribute('width', slide.scaledWidth)
                    vidDiv.dataset.hlsSrc = slide.hls
                    hls.loadSource(slide.hls);
                    hls.attachMedia(vidDiv);
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {
                        vidDiv.play();
                    });
                    hls.on(Hls.Events.ERROR, () => {
                        if (timeout) {
                            clearTimeout(timeout)
                        }
                        nextSlide(vidDiv)
                    })
                }
                replaceSlide(root, vidDiv, toRemove.pop(), slide.scaledWidth)
                let timeout;
                if (slide.type === 'long') {
                    vidDiv.currentTime = slide.start
                    timeout = setTimeout(() => nextSlide(vidDiv), settings.videoSplittingTime*1000)
                }
                vidDiv.addEventListener("ended", () => {
                    if (timeout) {
                        clearTimeout(timeout)
                    }
                    nextSlide(vidDiv)
                }, false)
                let clickTimer = null
                vidDiv.onclick = (e) => {
                    e.preventDefault()
                    if (clickTimer) {
                        // Double click: skip to next video
                        clearTimeout(clickTimer)
                        clickTimer = null
                        if (timeout) clearTimeout(timeout)
                        nextSlide(vidDiv)
                    } else {
                        // Single click: toggle pause/play (after short delay to detect double)
                        clickTimer = setTimeout(() => {
                            clickTimer = null
                            if (vidDiv.paused) {
                                vidDiv.play()
                            } else {
                                vidDiv.pause()
                            }
                        }, 250)
                    }
                }
            } else if (slide.format == "image") {
                let imgDiv = document.createElement("img")
                imgDiv.className = "imgSlide"
                if (slide.droppedFile) {
                    imgDiv.src = URL.createObjectURL(slide.droppedFile)
                    imgDiv.setAttribute("data-is-object", "true")
                } else if (slide.file) {
                    imgDiv.src = URL.createObjectURL(await slide.file.getFile())
                    imgDiv.setAttribute("data-is-object", "true")
                } else if (slide.url) {
                    imgDiv.src = slide.url
                }
                replaceSlide(root, imgDiv, toRemove.pop(), slide.scaledWidth)
                const timeout = setTimeout(() => nextSlide(imgDiv), jitter(settings.imageInterval*1000))
                imgDiv.onclick = () => {
                    clearTimeout(timeout)
                    nextSlide(imgDiv)
                }
            } else if (slide.format == "iframe") {
                let iframeDiv = parseIframe(slide.html)
                if (!iframeDiv) continue
                iframeDiv.setAttribute("width", slide.scaledWidth);
                iframeDiv.setAttribute("height", root.offsetHeight);
                iframeDiv.removeAttribute("style");
                iframeDiv.className = "iframeSlide";
                replaceSlide(root, iframeDiv, toRemove.pop(), slide.scaledWidth)
                const timeout = setTimeout(() => nextSlide(iframeDiv), jitter(settings.imageInterval*1000))
                iframeDiv.onclick = () => {
                    clearTimeout(timeout)
                    nextSlide(iframeDiv)
                }
            }
        }
        for(const e of toRemove) {
            if (Array.prototype.indexOf.call(root.children, e) >= 0) {
                const animation = e.animate([
                    { width: e.offsetWidth + "px" },
                    { width: 0 + "px" }
                ], 500)
                animation.onfinish = function() {
                    this.effect.target.parentNode.removeChild(this.effect.target);
                    disposeResources(this.effect.target)
                }
            }
        }
        toRemove = []
    }

    async function nextSlide(elemRemoved) {
        if (!root.isConnected) {
            return
        }
        if (elemRemoved) {
            toRemove.push(elemRemoved)
        }
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(loadMoreSlides, DEBOUNCE_MS)
    }

    await loadMoreSlides()
}

let slideshowGrid;

async function changeGrid() {
    while (slideshowGrid.children.length > settings.rows) {
        slideshowGrid.removeChild(slideshowGrid.children[slideshowGrid.children.length - 1])
    }
    let rowHeight = 100/settings.rows
    for (let child of document.getElementsByClassName("slideshow-row")) {
        child.style.height = rowHeight + "%"
    }
    for (let i = slideshowGrid.children.length; i < settings.rows; i++) {
        let ssRow = document.createElement("div")
        ssRow.className = "slideshow-row"
        ssRow.style.display = "flex"
        ssRow.style.height = rowHeight + "%"
        slideshowGrid.append(ssRow)
        if (inProgress) {
            setTimeout(() => startSlideShow(slideshowGrid.children[slideshowGrid.children.length - 1]), 100)
        }
    }
}

async function openDropped(droppedItems) {
    try {
        for (const e of document.getElementsByClassName("titleContent")) {
            e.style.display = 'none'
        }
        showLoader("Loading dropped files...")
        await loadDroppedFiles(droppedItems)
        inProgress = true
        slidesFetcher = nextFileSlides
        slidesRestarter = restartSlides
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
        hideLoader()
    } catch(e) {
        console.log(e)
        hideLoader()
    }
}

function showRedditForm() {
    for(let elem of document.getElementsByClassName("noForm")) {
        elem.style.display = 'none'
    }
    document.getElementById("redditForm").style.display = null
}

window.onload = () => {
    document.getElementById("browse").onclick = openDir2
    slideshowGrid = document.getElementById("slideshow-grid")
    document.getElementById("browseReddit").onclick = showRedditForm
    document.getElementById("redditSubmit").onclick = openReddit
    initSettings(changeGrid, goHome)
    initReddit()
    initDragDrop(openDropped)
}
