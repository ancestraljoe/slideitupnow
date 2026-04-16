const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i
const VIDEO_REGEX = /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|3gp)$/i

let onFilesCallback = null

function traverseEntry(entry) {
    return new Promise((resolve) => {
        if (entry.isFile) {
            entry.file((file) => {
                file._name = entry.fullPath || file.name
                resolve([file])
            }, () => resolve([]))
        } else if (entry.isDirectory) {
            const reader = entry.createReader()
            const allFiles = []
            function readBatch() {
                reader.readEntries(async (entries) => {
                    if (entries.length === 0) {
                        resolve(allFiles)
                        return
                    }
                    for (const e of entries) {
                        const files = await traverseEntry(e)
                        allFiles.push(...files)
                    }
                    readBatch()
                }, () => resolve(allFiles))
            }
            readBatch()
        } else {
            resolve([])
        }
    })
}

async function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    hideOverlay()

    const items = e.dataTransfer.items
    if (!items) return

    const allFiles = []
    const traversals = []

    for (const item of items) {
        const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.()
        if (entry) {
            traversals.push(traverseEntry(entry))
        }
    }

    const results = await Promise.all(traversals)
    for (const files of results) {
        for (const file of files) {
            if (IMAGE_REGEX.test(file.name)) {
                allFiles.push({ type: 'short', droppedFile: file, format: 'image', name: file.name })
            } else if (VIDEO_REGEX.test(file.name)) {
                allFiles.push({ type: 'short', droppedFile: file, format: 'video', name: file.name })
            }
        }
    }

    if (allFiles.length > 0 && onFilesCallback) {
        onFilesCallback(allFiles)
    }
}

function showOverlay() {
    const overlay = document.getElementById('drop-overlay')
    if (overlay) overlay.classList.add('visible')
}

function hideOverlay() {
    const overlay = document.getElementById('drop-overlay')
    if (overlay) overlay.classList.remove('visible')
}

let dragCounter = 0

export function initDragDrop(callback) {
    onFilesCallback = callback
    const welcome = document.getElementById('welcome')

    welcome.addEventListener('dragenter', (e) => {
        e.preventDefault()
        dragCounter++
        showOverlay()
    })

    welcome.addEventListener('dragover', (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
    })

    welcome.addEventListener('dragleave', (e) => {
        e.preventDefault()
        dragCounter--
        if (dragCounter <= 0) {
            dragCounter = 0
            hideOverlay()
        }
    })

    welcome.addEventListener('drop', handleDrop)
}
