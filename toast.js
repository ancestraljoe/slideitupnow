let toastTimeout = null

export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container')
    if (!container) {
        container = document.createElement('div')
        container.id = 'toast-container'
        document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.className = 'toast toast-' + type
    toast.textContent = message

    container.appendChild(toast)

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('visible'))

    // Auto-dismiss after 4 seconds
    const dismissTimer = setTimeout(() => dismissToast(toast), 4000)

    toast.onclick = () => {
        clearTimeout(dismissTimer)
        dismissToast(toast)
    }
}

function dismissToast(toast) {
    toast.classList.remove('visible')
    toast.addEventListener('transitionend', () => toast.remove(), { once: true })
    // Fallback if transitionend doesn't fire
    setTimeout(() => { if (toast.parentNode) toast.remove() }, 300)
}
