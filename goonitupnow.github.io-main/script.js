import { initSettings, settings, setIsPaused } from './settings.js';
import { showPicker, loadFiles, loadDroppedFiles, nextFileSlides, current, total, restartSlides, resetFiles } from './localFiles.js';
import { initDragDrop } from './dragdrop.js';
import { initFavorites, startFavSlides, nextFavSlides, restartFavSlides } from './favorites.js';
import { renderPlaylistChips, renderPlaylistSettings, promptSavePlaylist } from './playlists.js';
import { startReddit, nextRedditSlides, initReddit, resetReddit } from './reddit.js';
import { createVideoSlide, createImageSlide, createIframeSlide } from './slideFactory.js';
import { showToast } from './toast.js';
import { initGoonTimer, getSelectedMinutes, startTimer, stopTimer, pauseTimer, resumeTimer } from './goonTimer.js';
import { isEscalationEnabled, setEscalationMode, getEscalationLevel, getLevelLabel, getLevelColor, resetEscalation } from './escalation.js';

const DEBOUNCE_MS = 100;
let isEdging = false;
let edgeStartTime = null;
let edgeTimerInterval = null;

let inProgress = false;
let currentSourceConfig = null;
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

let levelUpdateInterval = null

function beginSession() {
    inProgress = true
    setEscalationMode(document.getElementById('intensityLevel')?.value || 'max')
    startTimer(getSelectedMinutes())
    // Update escalation level indicator
    if (isEscalationEnabled()) {
        updateLevelIndicator()
        levelUpdateInterval = setInterval(updateLevelIndicator, 5000)
    }
}

function updateLevelIndicator() {
    const el = document.getElementById('toolbarLevel')
    if (!el) return
    if (!isEscalationEnabled()) { el.textContent = ''; return }
    const level = getEscalationLevel()
    el.textContent = getLevelLabel(level)
    el.style.color = getLevelColor(level)
}

function hideTitleContent() {
    for (const e of document.getElementsByClassName("titleContent")) {
        e.style.display = 'none'
    }
}

function showTitleContent() {
    for (const e of document.getElementsByClassName("titleContent")) {
        e.style.display = null
    }
    for (const e of document.getElementsByClassName("noForm")) {
        e.style.display = null
    }
}

async function openDir2() {
    try {
        const folder = await showPicker()
        hideTitleContent()
        showLoader("Loading files...")
        await loadFiles(folder)
        beginSession()
        currentSourceConfig = { type: 'local', folderName: folder.name || 'Local' }
        slidesFetcher = nextFileSlides
        slidesRestarter = restartSlides
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
        hideLoader()
    } catch(e) {
        hideLoader()
        if (e.name !== 'AbortError') {
            showToast('Failed to load folder: ' + e.message, 'error')
        }
    }
}

async function openReddit() {
    showLoader("Loading from Reddit...")
    try {
        if (await startReddit()) {
            hideTitleContent()
            hideLoader()
            beginSession()
            currentSourceConfig = {
                type: 'reddit',
                subreddits: Array.from(document.getElementsByClassName("pickedSubreddit")).map(e => e.innerText.trim()),
                sort: document.getElementById("redditSort").value,
                time: document.getElementById("redditTime").value,
                roundRobin: document.getElementById("roundRobin").checked
            }
            slidesFetcher = nextRedditSlides
            for (const e of document.getElementsByClassName("slideshow-row")) {
                await startSlideShow(e)
            }
        } else {
            hideLoader()
            showToast('No subreddits selected', 'error')
            showTitleContent()
        }
    } catch(e) {
        hideLoader()
        showToast('Reddit loading failed: ' + e.message, 'error')
        showTitleContent()
    }
}

async function openFavorites() {
    startFavSlides()
    hideTitleContent()
    beginSession()
    slidesFetcher = nextFavSlides
    slidesRestarter = restartFavSlides
    for (const e of document.getElementsByClassName("slideshow-row")) {
        await startSlideShow(e)
    }
}

async function openDropped(droppedItems) {
    try {
        hideTitleContent()
        showLoader("Loading dropped files...")
        await loadDroppedFiles(droppedItems)
        beginSession()
        slidesFetcher = nextFileSlides
        slidesRestarter = restartSlides
        for (const e of document.getElementsByClassName("slideshow-row")) {
            await startSlideShow(e)
        }
        hideLoader()
    } catch(e) {
        hideLoader()
        showToast('Failed to load dropped files: ' + e.message, 'error')
    }
}

// --- Edge Pause ---

function toggleEdge() {
    if (!inProgress) return
    if (isEdging) {
        resumeFromEdge()
    } else {
        enterEdge()
    }
}

function enterEdge() {
    isEdging = true
    edgeStartTime = Date.now()
    pauseTimer()
    // Pause all videos
    for (const v of document.querySelectorAll('.videoSlide')) v.pause()
    // Show overlay
    document.getElementById('edge-overlay').classList.add('visible')
    // Start edge timer
    edgeTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - edgeStartTime) / 1000)
        const mins = Math.floor(elapsed / 60)
        const secs = elapsed % 60
        document.getElementById('edgeTimer').textContent = mins + ':' + String(secs).padStart(2, '0')
    }, 1000)
}

function resumeFromEdge() {
    isEdging = false
    if (edgeTimerInterval) { clearInterval(edgeTimerInterval); edgeTimerInterval = null }
    resumeTimer()
    // Resume videos
    for (const v of document.querySelectorAll('.videoSlide')) v.play()
    // Hide overlay
    document.getElementById('edge-overlay').classList.remove('visible')
    document.getElementById('edgeTimer').textContent = '0:00'
}

export { toggleEdge }

// --- Resource cleanup ---

function disposeElement(elem) {
    if (elem._cleanup) {
        elem._cleanup()
        return
    }
    // Fallback for unwrapped elements
    const media = elem.classList?.contains('slide-wrapper') ? elem.querySelector('video, img') : elem
    if (!media) return
    if (media.dataset?.isObject) URL.revokeObjectURL(media.src)
    if (media.dataset?.hlsSrc) {
        const hlsObj = hlsSources[media.dataset.hlsSrc]
        if (hlsObj) {
            try { hlsObj.detachMedia(); hlsObj.destroy() } catch(e) {}
            delete hlsSources[media.dataset.hlsSrc]
        }
    }
}

function disposeAllResources() {
    for (const key of Object.keys(hlsSources)) {
        try { hlsSources[key].detachMedia(); hlsSources[key].destroy() } catch(e) {}
    }
    hlsSources = {}
    for (const row of document.getElementsByClassName("slideshow-row")) {
        for (const child of Array.from(row.children)) {
            disposeElement(child)
        }
        row.textContent = ""
    }
}

// --- Slideshow ---

function replaceSlide(parent, newElem, oldElem, newWidth) {
    let oldWidth;
    if (oldElem && Array.prototype.indexOf.call(parent.children, oldElem) >= 0) {
        oldWidth = oldElem.offsetWidth
        newElem.style.width = oldWidth
        parent.replaceChild(newElem, oldElem)
        disposeElement(oldElem)
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

async function startSlideShow(root) {
    document.getElementById("welcome").style.display = 'none';
    document.getElementById("slideshow-grid").style.display = 'flex';
    for (const elem of document.getElementsByClassName("slideshow-row")) {
        elem.style.display = 'flex';
    }
    let debounceTimer;
    let toRemove = [];

    async function loadMoreSlides() {
        if (!inProgress) return
        let removedWidth = 0;
        for (const e of toRemove) removedWidth += e.offsetWidth

        let childrenWidth = 0;
        for (const child of root.children) childrenWidth += parseInt(child.dataset.realWidth)

        let usedWidth = childrenWidth - removedWidth;
        let slides = await slidesFetcher(root.offsetWidth - usedWidth, root.offsetHeight, usedWidth < 50)
        if (usedWidth < 50 && slides.length === 0 && slidesRestarter) {
            slidesRestarter()
            slides = await slidesFetcher(root.offsetWidth - usedWidth, root.offsetHeight, usedWidth < 50)
        }

        for (const slide of slides) {
            let wrapped = null

            if (slide.format === 'video') {
                wrapped = createVideoSlide(slide, nextSlide, settings, hlsSources)
                // Handle async FileSystemHandle
                const vidDiv = wrapped.querySelector('video')
                if (vidDiv?._pendingFile) {
                    const blob = await vidDiv._pendingFile.getFile()
                    const blobUrl = URL.createObjectURL(blob)
                    vidDiv.src = blobUrl
                    vidDiv.setAttribute("data-is-object", "true")
                    vidDiv.currentTime = 0
                    vidDiv.play()
                    delete vidDiv._pendingFile
                    // Patch cleanup to also revoke this blob
                    const origCleanup = wrapped._cleanup
                    wrapped._cleanup = () => {
                        URL.revokeObjectURL(blobUrl)
                        origCleanup()
                    }
                }
            } else if (slide.format === 'image') {
                wrapped = createImageSlide(slide, nextSlide, settings)
                const imgDiv = wrapped.querySelector('img')
                if (imgDiv?._pendingFile) {
                    const blob = await imgDiv._pendingFile.getFile()
                    const blobUrl = URL.createObjectURL(blob)
                    imgDiv.src = blobUrl
                    imgDiv.setAttribute("data-is-object", "true")
                    delete imgDiv._pendingFile
                    const origCleanup = wrapped._cleanup
                    wrapped._cleanup = () => {
                        URL.revokeObjectURL(blobUrl)
                        origCleanup()
                    }
                }
            } else if (slide.format === 'iframe') {
                wrapped = createIframeSlide(slide, nextSlide, settings, root.offsetHeight)
            }

            if (!wrapped) continue

            replaceSlide(root, wrapped, toRemove.pop(), slide.scaledWidth)
            if (wrapped._setupTimers) wrapped._setupTimers()
        }

        for (const e of toRemove) {
            if (Array.prototype.indexOf.call(root.children, e) >= 0) {
                const animation = e.animate([
                    { width: e.offsetWidth + "px" },
                    { width: "0px" }
                ], 500)
                animation.onfinish = function() {
                    this.effect.target.parentNode?.removeChild(this.effect.target)
                    disposeElement(this.effect.target)
                }
                // Fallback cleanup if animation doesn't finish
                setTimeout(() => {
                    if (e.parentNode) {
                        e.parentNode.removeChild(e)
                        disposeElement(e)
                    }
                }, 600)
            }
        }
        toRemove = []
    }

    async function nextSlide(elemRemoved) {
        if (!root.isConnected) return
        if (elemRemoved) toRemove.push(elemRemoved)
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(loadMoreSlides, DEBOUNCE_MS)
    }

    await loadMoreSlides()
}

// --- Grid ---

let slideshowGrid;

async function changeGrid() {
    while (slideshowGrid.children.length > settings.rows) {
        slideshowGrid.removeChild(slideshowGrid.children[slideshowGrid.children.length - 1])
    }
    let rowHeight = 100 / settings.rows
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

// --- Navigation ---

function goHome() {
    if (!inProgress) return
    disposeAllResources()
    if (isEdging) resumeFromEdge()
    stopTimer()
    resetEscalation()
    if (levelUpdateInterval) { clearInterval(levelUpdateInterval); levelUpdateInterval = null }
    document.getElementById('toolbarLevel').textContent = ''
    inProgress = false
    currentSourceConfig = null
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
    showTitleContent()
    refreshPlaylists()
}

function refreshPlaylists() {
    const container = document.getElementById('playlistsSection')
    if (container) renderPlaylistChips(container, onPlaylistClick)
}

async function onPlaylistClick(playlist) {
    if (playlist.type === 'reddit') {
        const pickedSubreddits = document.getElementById("pickedSubreddits")
        pickedSubreddits.textContent = ''
        for (const sub of playlist.subreddits) {
            const divElem = document.createElement("div")
            const spanElem = document.createElement("span")
            spanElem.className = "pickedSubreddit"
            spanElem.textContent = sub
            divElem.appendChild(spanElem)
            pickedSubreddits.appendChild(divElem)
        }
        document.getElementById("redditSort").value = playlist.sort || 'hot'
        document.getElementById("redditTime").value = playlist.time || 'day'
        document.getElementById("roundRobin").checked = !!playlist.roundRobin
        await openReddit()
    }
}

function showRedditForm() {
    for (let elem of document.getElementsByClassName("noForm")) {
        elem.style.display = 'none'
    }
    document.getElementById("redditForm").style.display = null
}

// --- Init ---

window.onload = () => {
    document.getElementById("browse").onclick = openDir2
    slideshowGrid = document.getElementById("slideshow-grid")
    document.getElementById("browseReddit").onclick = showRedditForm
    document.getElementById("redditSubmit").onclick = openReddit
    initSettings(changeGrid, goHome, toggleEdge)
    initReddit()
    initGoonTimer(goHome)
    document.getElementById('edgeBtn').onclick = toggleEdge
    document.getElementById('edge-overlay').onclick = resumeFromEdge
    initDragDrop(openDropped)
    initFavorites()
    const favCard = document.getElementById('browseFavorites')
    if (favCard) favCard.onclick = openFavorites

    // Playlists
    refreshPlaylists()
    renderPlaylistSettings(document.getElementById('playlistsSettingsGroup'))
    document.getElementById('savePlaylist').onclick = () => {
        if (currentSourceConfig) promptSavePlaylist(currentSourceConfig)
    }
}
