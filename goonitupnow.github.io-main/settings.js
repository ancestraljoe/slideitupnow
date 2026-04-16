let defaultSettings = {
    imageInterval: 20,
    rows: 2,
    volume: 1.0,
    videoSplittingTime: 60,
    bgColor: "ffc0cb"
}

const storedSettings = localStorage.getItem("settings")

export const settings = storedSettings != null ? {...defaultSettings, ...JSON.parse(storedSettings)} : defaultSettings;

export function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings))
}

// Shared pause state accessed by script.js
export let isPaused = false;

export function setIsPaused(value) {
    isPaused = value;
}

let gridChanged;

const VOLUME_TRACK_HEIGHT = 150;
const VOLUME_SLIDER_RADIUS = 16;

let settingsBarHeight = 0;
let draggingVolume = false;
let volumeSlider = null;
let volumeControl = null;
let volumeControlOpen = true;
let volumeIsScaled = matchMedia("(orientation: portrait) and (max-width: 1000px)").matches

function volumeHold(event) {
    event.preventDefault()
    volumeIsScaled = matchMedia("(orientation: portrait) and (max-width: 1000px)").matches
    settingsBarHeight = document.getElementById("bar").offsetHeight
    draggingVolume = true;
}

function volumeRelease() {
    if (draggingVolume) {
        saveSettings()
    }
    draggingVolume = false;
}

function volumeDrag(event) {
    if (draggingVolume) {
        event.preventDefault()
        let y = (event.clientY || event.touches[0].clientY) - settingsBarHeight - VOLUME_SLIDER_RADIUS
        if (volumeIsScaled) {
            y = y/2
        }
        if (y < 0) {
            y = 0
        }
        if (y > (VOLUME_TRACK_HEIGHT - VOLUME_SLIDER_RADIUS*2)) {
            y = VOLUME_TRACK_HEIGHT - VOLUME_SLIDER_RADIUS*2
        }
        volumeSlider.setAttribute('cy', y + VOLUME_SLIDER_RADIUS)
        settings.volume = 1 - y/(VOLUME_TRACK_HEIGHT - VOLUME_SLIDER_RADIUS*2)
        for (let e of document.getElementsByClassName("videoSlide")) {
            e.volume = settings.volume
        }
    }
}

function toggleVolume() {
    volumeControlOpen = !volumeControlOpen
    volumeControl.style.display = volumeControlOpen ? 'block' : 'none';
}

function setVolumeOnSlider() {
    let y = (1 - settings.volume)*(VOLUME_TRACK_HEIGHT - VOLUME_SLIDER_RADIUS*2) + VOLUME_SLIDER_RADIUS
    volumeSlider.setAttribute('cy', y)
}

function getPositiveValue(target) {
    let value = parseInt(target.value)
    if (value < 1) {
        value = 1
        target.value = 1
    }
    return value
}

function setRows(event) {
    settings.rows = getPositiveValue(event.target)
    saveSettings()
    gridChanged()
}

function bgColorChanged(event) {
    let color = event.target.value.trim()
    if (/^[0-9a-f]{6}$/i.test(color)) {
        document.body.style.backgroundColor = "#" + color
        settings.bgColor = color
        saveSettings()
    }
}

async function bgImageChanged(event) {
    var files = !!this.files ? this.files : [];
    if ( !files.length || !window.FileReader ) return;
    if ( /^image/.test( files[0].type ) ) {
        var reader = new FileReader();
        reader.readAsDataURL( files[0] );
        reader.onloadend = function() {
            document.body.style.backgroundImage = "url(" + this.result + ")";
        }
    }
}

function clearBgImage() {
    document.body.style.backgroundImage = ""
}

function setImageInterval(event) {
    settings.imageInterval = getPositiveValue(event.target)
    saveSettings()
}

function applySettings() {
    settings.videoSplittingTime = getPositiveValue(document.getElementById("videoSplitLength"))
    saveSettings()
    document.location.reload()
}

// --- Fullscreen ---
function toggleFullscreen() {
    const btn = document.getElementById("fullscreen")
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            btn.textContent = "exit fullscreen"
        }).catch(() => {})
    } else {
        document.exitFullscreen().then(() => {
            btn.textContent = "fullscreen"
        }).catch(() => {})
    }
}

document.addEventListener("fullscreenchange", () => {
    const btn = document.getElementById("fullscreen")
    if (btn) {
        btn.textContent = document.fullscreenElement ? "exit fullscreen" : "fullscreen"
    }
})

// --- Pause/Resume ---
function togglePause() {
    isPaused = !isPaused
    const btn = document.getElementById("pauseAll")
    btn.textContent = isPaused ? "resume" : "pause"
    for (let v of document.getElementsByClassName("videoSlide")) {
        isPaused ? v.pause() : v.play()
    }
}

// --- Keyboard shortcuts ---
function initKeyboard(onGoHome) {
    document.addEventListener("keydown", (e) => {
        const tag = document.activeElement.tagName.toLowerCase()
        if (tag === "input" || tag === "textarea" || tag === "select") return

        switch (e.key.toLowerCase()) {
            case "f":
                e.preventDefault()
                toggleFullscreen()
                break
            case " ":
                e.preventDefault()
                togglePause()
                break
            case "m":
                e.preventDefault()
                toggleVolume()
                break
            case "escape":
                document.getElementById("settingsDialog").style.display = "none"
                break
            case "h":
                e.preventDefault()
                onGoHome()
                break
        }
    })
}

export function initSettings(onGridChanged, onGoHome) {
    gridChanged = onGridChanged

    volumeSlider = document.getElementById("volumeSlider")
    volumeSlider.onmousedown = volumeHold
    volumeSlider.ontouchstart = volumeHold
    document.onmouseup = volumeRelease
    document.onmousemove = volumeDrag
    document.ontouchmove = volumeDrag
    volumeControl = document.getElementById("volumeControl")
    document.getElementById("volume").onclick = toggleVolume
    setVolumeOnSlider()

    document.getElementById("settings").onclick = () => { document.getElementById("settingsDialog").style.display = 'block' }
    document.getElementById("settingsClose").onclick = () => { document.getElementById("settingsDialog").style.display = 'none' }

    document.getElementById("rows").value = settings.rows
    document.getElementById("rows").onchange = setRows
    onGridChanged()

    document.getElementById("nextImageSec").value = settings.imageInterval
    document.getElementById("nextImageSec").onchange = setImageInterval

    document.getElementById("backgroundColor").value = settings.bgColor
    document.body.style.backgroundColor = "#" + settings.bgColor
    document.getElementById("backgroundColor").onchange = bgColorChanged

    document.getElementById("backgroundImage").onchange = bgImageChanged
    document.getElementById("clearBackgroundImage").onclick = clearBgImage
    document.getElementById("fill").onclick = () => { document.body.style.backgroundSize = "cover" }
    document.getElementById("fit").onclick = () => { document.body.style.backgroundSize = "contain" }

    document.getElementById("videoSplitLength").value = settings.videoSplittingTime
    document.getElementById("settingsApply").onclick = applySettings

    document.getElementById("menu-hover").onmouseenter = () => { document.getElementById("menu").style.display = "block" }
    document.getElementById("menu-hover").onmouseleave = () => { document.getElementById("menu").style.display = "none" }
    document.getElementById("menu-hover").ontouchstart = (event) => {
        event.stopPropagation()
        let menuElem = document.getElementById("menu")
        menuElem.style.display = "block";
    }
    document.ontouchstart = () => {
        let menuElem = document.getElementById("menu")
        if (menuElem.style.display == "block") {
            menuElem.style.display = "none"
        }
    }

    // Fullscreen button
    document.getElementById("fullscreen").onclick = (e) => { e.preventDefault(); toggleFullscreen() }

    // Pause button
    document.getElementById("pauseAll").onclick = (e) => { e.preventDefault(); togglePause() }

    // Home button
    if (onGoHome) {
        document.getElementById("backHome").onclick = (e) => { e.preventDefault(); onGoHome() }
        initKeyboard(onGoHome)
    }
}
