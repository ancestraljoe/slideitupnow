const STORAGE_KEY = 'favorites'

function loadFavorites() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch { return [] }
}

function saveFavorites(favs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs))
    updateBadge()
}

function generateId(slideInfo) {
    return slideInfo.url || slideInfo.name || String(Date.now())
}

export function getFavorites() {
    return loadFavorites()
}

export function getFavoriteCount() {
    return loadFavorites().length
}

export function isFavorited(slideInfo) {
    const id = generateId(slideInfo)
    return loadFavorites().some(f => f.id === id)
}

export function addFavorite(slideInfo) {
    const favs = loadFavorites()
    const id = generateId(slideInfo)
    if (favs.some(f => f.id === id)) return
    favs.push({
        id,
        url: slideInfo.url || null,
        name: slideInfo.name || null,
        format: slideInfo.format,
        source: slideInfo.source || 'local',
        width: slideInfo.width,
        height: slideInfo.height,
        addedAt: Date.now()
    })
    saveFavorites(favs)
}

export function removeFavorite(slideInfo) {
    const id = generateId(slideInfo)
    const favs = loadFavorites().filter(f => f.id !== id)
    saveFavorites(favs)
}

export function toggleFavorite(slideElem, slideInfo) {
    if (isFavorited(slideInfo)) {
        removeFavorite(slideInfo)
        slideElem.closest('.slide-wrapper')?.querySelector('.slide-fav-btn')?.classList.remove('favorited')
    } else {
        addFavorite(slideInfo)
        slideElem.closest('.slide-wrapper')?.querySelector('.slide-fav-btn')?.classList.add('favorited')
    }
}

export function createFavButton(slideInfo) {
    const btn = document.createElement('button')
    btn.className = 'slide-fav-btn'
    btn.textContent = '\u2665'
    btn.title = 'Add to favorites'
    if (isFavorited(slideInfo)) btn.classList.add('favorited')
    btn.onclick = (e) => {
        e.stopPropagation()
        e.preventDefault()
        if (isFavorited(slideInfo)) {
            removeFavorite(slideInfo)
            btn.classList.remove('favorited')
        } else {
            addFavorite(slideInfo)
            btn.classList.add('favorited')
        }
    }
    return btn
}

export function wrapSlide(slideElem, slideInfo) {
    const wrapper = document.createElement('div')
    wrapper.className = 'slide-wrapper'
    wrapper.style.position = 'relative'
    wrapper.style.height = '100%'
    wrapper.appendChild(slideElem)
    wrapper.appendChild(createFavButton(slideInfo))
    return wrapper
}

function updateBadge() {
    const badge = document.getElementById('fav-count')
    if (!badge) return
    const count = loadFavorites().length
    badge.textContent = count > 0 ? count : ''
    badge.style.display = count > 0 ? 'inline-flex' : 'none'
}

export function initFavorites() {
    updateBadge()
}

// Generate slides from favorites for the slideshow
export function getFavoriteSlides(remainingWidth, height) {
    const favs = loadFavorites().filter(f => f.url)
    const toAdd = []
    let newRemainingWidth = remainingWidth
    for (const fav of favs) {
        const w = fav.width || 16
        const h = fav.height || 9
        const scaledWidth = (height / h) * w
        if (scaledWidth < newRemainingWidth) {
            toAdd.push({ ...fav, scaledWidth, type: 'short' })
            newRemainingWidth -= scaledWidth
        }
    }
    return toAdd
}

let favIndex = 0
let favList = []

export function startFavSlides() {
    favList = loadFavorites().filter(f => f.url)
    favIndex = 0
}

export function nextFavSlides(remainingWidth, height) {
    if (favList.length === 0) return []
    const toAdd = []
    let newRemainingWidth = remainingWidth
    while (favIndex < favList.length && newRemainingWidth > 50) {
        const fav = favList[favIndex]
        const w = fav.width || 16
        const h = fav.height || 9
        const scaledWidth = (height / h) * w
        if (scaledWidth < newRemainingWidth) {
            toAdd.push({ ...fav, scaledWidth, type: 'short' })
            newRemainingWidth -= scaledWidth
            favIndex++
        } else {
            break
        }
    }
    return toAdd
}

export function restartFavSlides() {
    favIndex = 0
}
