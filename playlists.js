const STORAGE_KEY = 'playlists'

function loadPlaylists() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    } catch { return [] }
}

function savePlaylists(lists) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

export function getPlaylists() {
    return loadPlaylists()
}

export function savePlaylist(name, config) {
    const lists = loadPlaylists().filter(p => p.name !== name)
    lists.push({ ...config, name, createdAt: Date.now() })
    savePlaylists(lists)
}

export function deletePlaylist(name) {
    savePlaylists(loadPlaylists().filter(p => p.name !== name))
}

export function renderPlaylistChips(container, onPlaylistClick) {
    container.textContent = ''
    const lists = loadPlaylists()
    if (lists.length === 0) {
        container.style.display = 'none'
        return
    }
    container.style.display = 'block'
    const title = document.createElement('p')
    title.className = 'playlists-title'
    title.textContent = 'Playlists'
    container.appendChild(title)

    const chips = document.createElement('div')
    chips.className = 'playlist-chips'
    for (const pl of lists) {
        const chip = document.createElement('button')
        chip.className = 'playlist-chip'
        const iconSpan = document.createElement('span')
        iconSpan.className = 'chip-icon'
        iconSpan.textContent = pl.type === 'reddit' ? '\u{1F517}' : '\u{1F4C1}'
        const nameSpan = document.createElement('span')
        nameSpan.className = 'chip-name'
        nameSpan.textContent = pl.name
        chip.appendChild(iconSpan)
        chip.appendChild(nameSpan)
        chip.title = pl.type === 'reddit' ? 'Reddit: ' + pl.subreddits.join(', ') : 'Local folder: ' + pl.folderName
        chip.onclick = () => onPlaylistClick(pl)
        chips.appendChild(chip)
    }
    container.appendChild(chips)
}

export function renderPlaylistSettings(container) {
    container.textContent = ''
    const lists = loadPlaylists()
    if (lists.length === 0) {
        const row = document.createElement('div')
        row.className = 'settings-row'
        const label = document.createElement('label')
        label.style.color = 'var(--text-muted)'
        label.textContent = 'No playlists saved'
        row.appendChild(label)
        container.appendChild(row)
        return
    }
    for (const pl of lists) {
        const row = document.createElement('div')
        row.className = 'settings-row'
        const label = document.createElement('label')
        const icon = pl.type === 'reddit' ? '\u{1F517}' : '\u{1F4C1}'
        label.textContent = icon + ' ' + pl.name
        const btn = document.createElement('button')
        btn.className = 'btn-small btn-danger'
        btn.textContent = 'Delete'
        btn.onclick = () => {
            deletePlaylist(pl.name)
            renderPlaylistSettings(container)
        }
        row.appendChild(label)
        row.appendChild(btn)
        container.appendChild(row)
    }
}

export function promptSavePlaylist(currentConfig) {
    const name = prompt('Playlist name:')
    if (!name || !name.trim()) return
    savePlaylist(name.trim(), currentConfig)
}
