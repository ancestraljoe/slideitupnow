import { isTimerActive, getTimeRemaining } from './goonTimer.js'

let mode = 'max' // 'auto', '1', '2', '3', '4' (fixed), 'max' = all
let startTime = null
const LEVEL_DURATION_MS = 10 * 60 * 1000 // 10 minutes per level without timer

export function setEscalationMode(value) {
    mode = value
    if (mode === 'auto') {
        startTime = Date.now()
    } else {
        startTime = null
    }
}

export function getEscalationMode() {
    return mode
}

export function getEscalationLevel() {
    // Fixed level
    if (mode !== 'auto') return parseInt(mode) || 4

    // Auto: level based on elapsed time
    if (!startTime) return 1
    const elapsed = Date.now() - startTime
    const progress = elapsed / (4 * LEVEL_DURATION_MS)

    if (progress < 0.25) return 1
    if (progress < 0.5) return 2
    if (progress < 0.75) return 3
    return 4
}

export function isEscalationEnabled() {
    return mode !== 'max'
}

export function resetEscalation() {
    mode = 'max'
    startTime = null
}

export function shouldShowSlide(slideIntensity) {
    return slideIntensity <= getEscalationLevel()
}

export function getLevelLabel(level) {
    switch(level) {
        case 1: return 'Soft'
        case 2: return 'Medium'
        case 3: return 'Intense'
        case 4: return 'Max'
        default: return ''
    }
}

export function getLevelColor(level) {
    switch(level) {
        case 1: return '#22c55e'
        case 2: return '#eab308'
        case 3: return '#f97316'
        case 4: return '#ef4444'
        default: return 'var(--text-muted)'
    }
}
