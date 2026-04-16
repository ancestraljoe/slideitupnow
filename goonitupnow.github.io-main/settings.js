let defaultSettings = {
    imageInterval: 20,
    rows: 2,
    volume: 1.0,
    videoSplittingTime: 60,
    bgColor: "0a0a0b"
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

// --- Theme ---
function initTheme() {
    const saved = localStorage.getItem('theme')
    const preferred = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    document.documentElement.setAttribute('data-theme', preferred)
    updateThemeButtons(preferred)
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    updateThemeButtons(next)
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    updateThemeButtons(theme)
}

function updateThemeButtons(theme) {
    const darkBtn = document.getElementById('themeDark')
    const lightBtn = document.getElementById('themeLight')
    const toggleBtn = document.getElementById('themeToggle')
    if (darkBtn && lightBtn) {
        darkBtn.classList.toggle('active', theme === 'dark')
        lightBtn.classList.toggle('active', theme === 'light')
    }
    if (toggleBtn) {
        toggleBtn.querySelector('.btn-icon').textContent = theme === 'dark' ? '\u263D' : '\u2600'
    }
}

// --- Volume (HTML range) ---
function initVolume() {
    const range = document.getElementById('volumeRange')
    range.value = settings.volume * 100
    range.oninput = function() {
        settings.volume = this.value / 100
        for (let v of document.getElementsByClassName("videoSlide")) {
            v.volume = settings.volume
        }
    }
    range.onchange = function() {
        saveSettings()
    }
}

// --- Menu auto-hide ---
let menuHideTimeout;
const MENU_HIDE_DELAY = 3000;

function initMenuAutoHide() {
    const toolbar = document.getElementById('menu-toolbar')
    function showMenu() {
        toolbar.classList.remove('hidden')
        clearTimeout(menuHideTimeout)
        menuHideTimeout = setTimeout(() => toolbar.classList.add('hidden'), MENU_HIDE_DELAY)
    }
    document.addEventListener('mousemove', showMenu)
    document.addEventListener('touchstart', showMenu)
    // Keep menu visible while hovering it
    toolbar.addEventListener('mouseenter', () => clearTimeout(menuHideTimeout))
    toolbar.addEventListener('mouseleave', () => {
        menuHideTimeout = setTimeout(() => toolbar.classList.add('hidden'), MENU_HIDE_DELAY)
    })
}

// --- Settings helpers ---
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
    if (!files.length || !window.FileReader) return;
    if (/^image/.test(files[0].type)) {
        var reader = new FileReader();
        reader.readAsDataURL(files[0]);
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

// --- Settings modal ---
function openSettings() {
    document.getElementById("settingsOverlay").classList.add("open")
}

function closeSettings() {
    document.getElementById("settingsOverlay").classList.remove("open")
}

// --- Fullscreen ---
function toggleFullscreen() {
    const btn = document.getElementById("fullscreen")
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            btn.querySelector('.btn-label').textContent = "Exit"
        }).catch(() => {})
    } else {
        document.exitFullscreen().then(() => {
            btn.querySelector('.btn-label').textContent = "Fullscreen"
        }).catch(() => {})
    }
}

document.addEventListener("fullscreenchange", () => {
    const btn = document.getElementById("fullscreen")
    if (btn) {
        btn.querySelector('.btn-label').textContent = document.fullscreenElement ? "Exit" : "Fullscreen"
    }
})

// --- Pause/Resume ---
function togglePause() {
    isPaused = !isPaused
    const btn = document.getElementById("pauseAll")
    btn.querySelector('.btn-label').textContent = isPaused ? "Resume" : "Pause"
    btn.querySelector('.btn-icon').textContent = isPaused ? '\u25B6' : '\u23F8'
    for (let v of document.getElementsByClassName("videoSlide")) {
        isPaused ? v.pause() : v.play()
    }
}

// --- Reddit form back button ---
function initRedditBack() {
    const backBtn = document.getElementById("redditBack")
    if (backBtn) {
        backBtn.onclick = function() {
            document.getElementById("redditForm").style.display = 'none'
            for (const e of document.getElementsByClassName("noForm")) {
                e.style.display = null
            }
        }
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
            case "t":
                e.preventDefault()
                toggleTheme()
                break
            case "escape":
                closeSettings()
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

    // Theme
    initTheme()

    // Volume
    initVolume()

    // Menu auto-hide
    initMenuAutoHide()

    // Settings modal
    document.getElementById("settings").onclick = openSettings
    document.getElementById("settingsClose").onclick = closeSettings
    document.getElementById("settingsOverlay").onclick = (e) => {
        if (e.target === document.getElementById("settingsOverlay")) closeSettings()
    }

    // Rows
    document.getElementById("rows").value = settings.rows
    document.getElementById("rows").onchange = setRows
    onGridChanged()

    // Image interval
    document.getElementById("nextImageSec").value = settings.imageInterval
    document.getElementById("nextImageSec").onchange = setImageInterval

    // Background color
    document.getElementById("backgroundColor").value = settings.bgColor
    document.body.style.backgroundColor = "#" + settings.bgColor
    document.getElementById("backgroundColor").onchange = bgColorChanged

    // Background image
    document.getElementById("backgroundImage").onchange = bgImageChanged
    document.getElementById("clearBackgroundImage").onclick = clearBgImage
    document.getElementById("fill").onclick = () => { document.body.style.backgroundSize = "cover" }
    document.getElementById("fit").onclick = () => { document.body.style.backgroundSize = "contain" }

    // Video split
    document.getElementById("videoSplitLength").value = settings.videoSplittingTime
    document.getElementById("settingsApply").onclick = applySettings

    // Theme buttons in settings
    document.getElementById("themeDark").onclick = () => setTheme('dark')
    document.getElementById("themeLight").onclick = () => setTheme('light')

    // Theme toggle in toolbar
    document.getElementById("themeToggle").onclick = toggleTheme

    // Fullscreen
    document.getElementById("fullscreen").onclick = (e) => { e.preventDefault(); toggleFullscreen() }

    // Pause
    document.getElementById("pauseAll").onclick = (e) => { e.preventDefault(); togglePause() }

    // Home
    if (onGoHome) {
        document.getElementById("backHome").onclick = (e) => { e.preventDefault(); onGoHome() }
        initKeyboard(onGoHome)
    }

    // Reddit back
    initRedditBack()
}
