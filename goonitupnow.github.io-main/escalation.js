import { isTimerActive, getTimeRemaining } from './goonTimer.js'

let enabled = false
let startTime = null
let levelInterval = null
const LEVEL_DURATION_MS = 10 * 60 * 1000 // 10 minutes per level without timer

// Intensity levels for presets (can be extended)
const PRESET_LEVELS = {
    'Pussy': 1,
    'Cock Suckers': 2,
    'Cum': 2,
    'GOON': 3,
    'Hentai': 3,
    'Fem Cock': 3,
    'BBC': 4,
    'Hypno/Conversion': 4,
    'Hentai Bestiality and Monsters': 4
}

export function isEscalationEnabled() {
    return enabled
}

export function setEscalationEnabled(value) {
    enabled = value
    if (enabled) {
        startTime = Date.now()
    } else {
        startTime = null
    }
}

export function getEscalationLevel() {
    if (!enabled) return 4 // All content allowed when disabled

    if (isTimerActive()) {
        // Level based on timer progress (0-100%)
        // Timer counts DOWN, so lower remaining = higher progress
        const remaining = getTimeRemaining()
        // We need total to calculate progress, estimate from remaining
        // Use a simpler approach: level based on elapsed time since start
    }

    // Level based on elapsed time since session start
    if (!startTime) return 1
    const elapsed = Date.now() - startTime
    const progress = isTimerActive()
        ? 1 - (getTimeRemaining() / Math.max(getTimeRemaining() + (elapsed / 1000), 1))
        : elapsed / (4 * LEVEL_DURATION_MS)

    if (progress < 0.25) return 1
    if (progress < 0.5) return 2
    if (progress < 0.75) return 3
    return 4
}

export function getPresetIntensity(presetName) {
    return PRESET_LEVELS[presetName] || 2
}

export function resetEscalation() {
    startTime = null
    enabled = false
}

export function shouldShowSlide(slideIntensity) {
    if (!enabled) return true
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
