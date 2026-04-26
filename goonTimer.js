let timerInterval = null
let totalSeconds = 0
let remainingSeconds = 0
let onEndCallback = null
let isPaused = false

export function initGoonTimer(onTimerEnd) {
    onEndCallback = onTimerEnd

    // Timer picker buttons
    for (const btn of document.querySelectorAll('.timer-btn')) {
        btn.onclick = () => {
            for (const b of document.querySelectorAll('.timer-btn')) b.classList.remove('active')
            btn.classList.add('active')
        }
    }

    // Timer end overlay buttons
    document.getElementById('timerEdgeMore').onclick = () => {
        hideTimerEndOverlay()
        extendTimer(10)
    }
    document.getElementById('timerKeepGoing').onclick = () => {
        hideTimerEndOverlay()
        stopTimer()
    }
    document.getElementById('timerFinish').onclick = () => {
        hideTimerEndOverlay()
        if (onEndCallback) onEndCallback()
    }
}

export function getSelectedMinutes() {
    const active = document.querySelector('.timer-btn.active')
    return active ? parseInt(active.dataset.minutes) || 0 : 0
}

export function startTimer(minutes) {
    if (!minutes || minutes <= 0) {
        updateToolbarTimer('')
        return
    }
    totalSeconds = minutes * 60
    remainingSeconds = totalSeconds
    isPaused = false

    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(tick, 1000)
    updateDisplay()
}

export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
    }
    remainingSeconds = 0
    totalSeconds = 0
    updateToolbarTimer('')
    updateProgressBar(0)
}

export function extendTimer(minutes) {
    remainingSeconds += minutes * 60
    totalSeconds += minutes * 60
    isPaused = false
    if (!timerInterval) {
        timerInterval = setInterval(tick, 1000)
    }
    updateDisplay()
}

export function pauseTimer() {
    isPaused = true
}

export function resumeTimer() {
    isPaused = false
}

export function getTimeRemaining() {
    return remainingSeconds
}

export function isTimerActive() {
    return timerInterval !== null && remainingSeconds > 0
}

function tick() {
    if (isPaused) return
    remainingSeconds--
    updateDisplay()
    if (remainingSeconds <= 0) {
        clearInterval(timerInterval)
        timerInterval = null
        showTimerEndOverlay()
    }
}

function updateDisplay() {
    const mins = Math.floor(remainingSeconds / 60)
    const secs = remainingSeconds % 60
    const timeStr = mins + ':' + String(secs).padStart(2, '0')
    updateToolbarTimer(timeStr)
    updateProgressBar(totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0)
}

function updateToolbarTimer(text) {
    const el = document.getElementById('toolbarTimer')
    if (el) el.textContent = text
}

function updateProgressBar(progress) {
    const bar = document.getElementById('goon-timer-bar')
    if (!bar) return
    if (progress <= 0) {
        bar.style.display = 'none'
        return
    }
    bar.style.display = 'block'
    bar.style.width = (progress * 100) + '%'
}

function showTimerEndOverlay() {
    document.getElementById('timer-end-overlay').classList.add('visible')
}

function hideTimerEndOverlay() {
    document.getElementById('timer-end-overlay').classList.remove('visible')
}
