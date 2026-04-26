import { redditPresets } from './reddit_presets.js'
import { shuffle, scaleWidth } from './utils.js'

let redditSlideGroups = [];
const REDDIT_ENDPOINTS = [
    "/reddit/r/",
    "https://api.reddit.com/r/",
    "https://www.reddit.com/r/"
]
let baseUrl = REDDIT_ENDPOINTS[0];
let urlSuffix;
let redditSlideGroupIndex = 0;
let redgifsUrlPattern = /http:\/\/[^.]+/

export function resetReddit() {
    redditSlideGroups = []
    redditSlideGroupIndex = 0
    urlSuffix = undefined
}

let gifPriorityEnabled = false

export async function startReddit() {
    addSubreddit();
    let subreddits = [];
    // Collect from checked presets
    for (const cb of document.querySelectorAll('#presetCheckboxes input:checked')) {
        const preset = redditPresets.find(p => p.name === cb.value)
        if (preset) preset.subreddits.forEach(s => subreddits.push(s))
    }
    // Collect from manually added subreddits
    for (const redditElem of document.getElementsByClassName("pickedSubreddit")) {
        redditElem.innerText.trim().split("+").forEach((sr) => {
            if (sr.trim()) subreddits.push(sr.trim())
        })
    }
    // Deduplicate
    subreddits = [...new Set(subreddits)]
    if (subreddits.length == 0) {
        return false;
    }
    gifPriorityEnabled = document.getElementById("gifPriority")?.checked || false
    const sort = document.getElementById("redditSort").value;
    const time = document.getElementById("redditTime").value
    const roundRobin = document.getElementById("roundRobin").checked
    urlSuffix = "/" + sort + "/"
    urlSuffix += ".json"
    urlSuffix += "?t=" + time
    saveProfile(subreddits, sort, time, roundRobin);
    if (roundRobin) {
        redditSlideGroups = shuffle(subreddits).map((subreddit) => ({subreddits: subreddit, slides: [], isLoading: false}))
    } else {
        redditSlideGroups.push({subreddits: shuffle(subreddits).join("+"), slides: [], isLoading: false})
    }
    await Promise.all(redditSlideGroups.map(obj => loadNextPage(obj)))
    return true
}


async function loadNextPage(slideDefinition) {
    if (slideDefinition.after === null) {
        redditSlideGroups.splice(redditSlideGroups.indexOf(slideDefinition), 1)
        redditSlideGroupIndex = redditSlideGroupIndex % redditSlideGroups.length
        return
    }
    if (slideDefinition.isLoading) {
        return
    }
    slideDefinition.isLoading = true;
    let jsonResp = null
    for (const endpoint of REDDIT_ENDPOINTS) {
        const url = endpoint + slideDefinition.subreddits + urlSuffix + (slideDefinition.after ? "&after=" + slideDefinition.after : "")
        try {
            const response = await fetch(url)
            jsonResp = await response.json()
            if (jsonResp?.data?.children) {
                baseUrl = endpoint // stick with working endpoint
                break
            }
        } catch(e) { continue }
    }
    if (!jsonResp?.data?.children) {
        redditSlideGroups.splice(redditSlideGroups.indexOf(slideDefinition), 1)
        slideDefinition.isLoading = false
        return
    }
    try {
        let metadataPromises = []
        slideDefinition.after = jsonResp.data.after
        for (let child of jsonResp.data.children) {
            if (child.data.stickied) {
                continue;
            }
            if (child.data.gallery_data) {
                for (let gallery_child of child.data.gallery_data.items) {
                    const mediaId = gallery_child.media_id
                    const media = child.data.media_metadata[mediaId]
                    if (media) {
                        if (media.m.indexOf("image") === 0) {
                            let fileEnding = media.m.split("/")[1]
                            slideDefinition.slides.push({type: 'short', url: 'https://i.redd.it/' + media.id + '.' + fileEnding, format: 'image', width: media.s.x, height: media.s.y, title: child.data.title, isAnimated: fileEnding === 'gif'})
                        }
                    }
                }
            } else if (child.data.media_embed && child.data.media_embed.content) {
                let elem = document.createElement("div")
                elem.innerHTML = child.data.media_embed.content
                const decoded = elem.innerText
                if (decoded.trimStart().toLowerCase().startsWith('<iframe')) {
                    slideDefinition.slides.push({format: 'iframe', html: decoded, height: child.data.media_embed.height, width: child.data.media_embed.width, title: child.data.title, isAnimated: true})
                }
            } else if (child.data.url && /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(child.data.url)) {
                const isGif = /\.gif$/i.test(child.data.url)
                const imgObj = {type: 'short', url: child.data.url, format: 'image', title: child.data.title, isAnimated: isGif}
                if (child.data.preview && child.data.preview.images && child.data.preview.images[0].source) {
                    imgObj.width = child.data.preview.images[0].source.width
                    imgObj.height = child.data.preview.images[0].source.height
                } else {
                    metadataPromises.push(loadImageMetadata(imgObj));
                }
                slideDefinition.slides.push(imgObj)
            }
        }
        await Promise.all(metadataPromises)
        // GIF priority: sort animated content first
        if (gifPriorityEnabled) {
            slideDefinition.slides.sort((a, b) => (b.isAnimated ? 1 : 0) - (a.isAnimated ? 1 : 0))
        }
    } catch (e) {
        redditSlideGroups.splice(redditSlideGroups.indexOf(slideDefinition), 1)
    }
    slideDefinition.isLoading = false
}

function loadImageMetadata(imgObj) {
    const timeout = new Promise((resolve) => setTimeout(() => {
        imgObj.width = 1
        imgObj.height = 1
        resolve()
    }, 8000))

    const load = new Promise((resolve) => {
        let img = new Image();
        img.onload = function() {
            imgObj.width = img.width
            imgObj.height = img.height
            resolve()
        };
        img.onerror = function(e) {
            console.error(e)
            imgObj.width = 1
            imgObj.height = 1
            resolve()
        }
        img.src = imgObj.url
    })

    return Promise.race([load, timeout])
}

// scaleWidth imported from utils.js

export async function nextRedditSlides(remainingWidth, height, isEmpty) {
    if (redditSlideGroups.length === 0) return []
    let toAdd = [];
    let newRemainingWidth = remainingWidth;
    while (newRemainingWidth > 50) {
        while (redditSlideGroups[redditSlideGroupIndex].slides.length === 0) {
            redditSlideGroups.splice(redditSlideGroupIndex, 1)
            redditSlideGroupIndex = redditSlideGroupIndex % redditSlideGroups.length
        }
        let slideInfo = getSlideFromGroup(redditSlideGroups[redditSlideGroupIndex], newRemainingWidth, height, isEmpty)
        if (slideInfo === null) {
            break;
        }
        if (redditSlideGroups[redditSlideGroupIndex].slides.length < 10) {
            loadNextPage(redditSlideGroups[redditSlideGroupIndex])
        }
        redditSlideGroupIndex = (redditSlideGroupIndex + 1) % redditSlideGroups.length
        toAdd.push(slideInfo.slide)
        newRemainingWidth = slideInfo.newRemainingWidth
    }
    return toAdd
}

function getSlideFromGroup(redditSlideGroup, remainingWidth, height, isEmpty) {
    let newRemainingWidth = remainingWidth;
    for (let i = 0; i < redditSlideGroup.slides.length && i < 10; i++) {
        let scaledWidth = scaleWidth(height, redditSlideGroup.slides[i].height, redditSlideGroup.slides[i].width)
        redditSlideGroup.slides[i].scaledWidth = scaledWidth
        if (scaledWidth < newRemainingWidth) {
            let slide = redditSlideGroup.slides.splice(i, 1)[0]
            newRemainingWidth -= scaledWidth
            return { slide, newRemainingWidth }
        }
    }
    if (isEmpty) {
        let scaledHeight = scaleWidth(remainingWidth, redditSlideGroup.slides[0].width, redditSlideGroup.slides[0].height)
        let scaledWidth = scaleWidth(scaledHeight, redditSlideGroup.slides[0].height, redditSlideGroup.slides[0].width)
        redditSlideGroup.slides[0].scaledWidth = scaledWidth;
        let slide = redditSlideGroup.slides.splice(0, 1)[0]
        return { slide, newRemainingWidth: 0 }
    }
    return null
}

let subredditInput;
let pickedSubreddits;
let redditTimeContainer;
let profileTextInput;
let profilePicker;

const SUBREDDIT_REGEX = /^[a-zA-Z0-9_]{2,21}$/

function showSubredditError(msg) {
    const errElem = document.getElementById("subredditError")
    if (!errElem) return
    errElem.textContent = msg
    errElem.style.display = msg ? 'block' : 'none'
}

function addSubreddit() {
    const val = subredditInput.value.trim()
    if (val === "") return
    if (!SUBREDDIT_REGEX.test(val)) {
        showSubredditError("Invalid subreddit name (2-21 chars, letters/numbers/underscore)")
        return
    }
    showSubredditError("")
    addSubredditValue(val)
    subredditInput.value = ""
}

function addSubredditValue(subredditName) {
    const divElem = document.createElement("div");
    const spanElem = document.createElement("span");
    spanElem.className = "pickedSubreddit";
    spanElem.textContent = subredditName;
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = function() { pickedSubreddits.removeChild(divElem) }
    divElem.appendChild(spanElem);
    divElem.appendChild(document.createTextNode(" "));
    divElem.appendChild(removeBtn);
    pickedSubreddits.appendChild(divElem)
}

function changeSort() {
    const val = document.getElementById("redditSort").value
    if (val == "top" || val == "controversial") {
        redditTimeContainer.style.display = "flex"
    } else {
        redditTimeContainer.style.display = "none"
    }
}

function setSelectValue(selectElement, value) {
    for (const child of selectElement.children) {
        if (child.value == value) {
            child.setAttribute("selected", "selected")
        } else {
            child.removeAttribute("selected")
        }
    }
}

function profileChanged(event) {
    let profileName = event.target.value.trim()
    if (profileName == "__create") {
        document.getElementById("profileInput").style.display = "flex"
    } else {
        document.getElementById("profileInput").style.display = "none"
    }
    if (profileName.indexOf("__") == -1) {
        let profile;
        if (profileName.indexOf("--preset--") == 0) {
            profileName = profileName.replace("--preset--", "")
            profile = redditPresets.filter(prof => prof.name == profileName)[0]
        } else {
            const redditProfileString = localStorage.getItem("redditProfiles")
            if (redditProfileString == null) {
                return
            }
            const customProfiles = JSON.parse(redditProfileString)
            profile = customProfiles.filter(prof => prof.name == profileName)[0]
        }
        setSelectValue(document.getElementById("redditSort"), profile.sort)
        changeSort()
        setSelectValue(document.getElementById("redditTime"), profile.time)
        pickedSubreddits.innerHTML = ""
        profile.subreddits.forEach(addSubredditValue)
        document.getElementById("roundRobin").checked = !!profile.roundRobin
    }
}

function saveProfile(subreddits, sort, time, roundRobin) {
    let name = profilePicker.value == "__create" ? profileTextInput.value.trim() : profilePicker.value.trim()
    if (name != '__none' && name != '') {
        if (name.indexOf("--preset--") == 0) {
            name = name.replace("--preset--", "")
            let preset = redditPresets.find((profile) => profile.name == name)
            if (preset && preset.subreddits.sort().join() === subreddits.sort().join()) {
                return
            }
        }
        let profilesString = localStorage.getItem("redditProfiles") || "[]"
        let profiles = JSON.parse(profilesString).filter(prof => prof.name != name)
        profiles.push({
            name,
            subreddits,
            sort,
            time,
            roundRobin
        })
        localStorage.setItem("redditProfiles", JSON.stringify(profiles))
    }
}

function fillPresetCheckboxes() {
    const container = document.getElementById('presetCheckboxes')
    if (!container) return
    for (const preset of redditPresets) {
        const label = document.createElement('label')
        label.className = 'preset-checkbox'
        const cb = document.createElement('input')
        cb.type = 'checkbox'
        cb.value = preset.name
        const span = document.createElement('span')
        span.textContent = preset.name
        label.appendChild(cb)
        label.appendChild(span)
        container.appendChild(label)
    }
}

async function discoverSubreddits() {
    const query = subredditInput.value.trim()
    if (!query) return
    const dropdown = document.getElementById('discoverDropdown')
    dropdown.style.display = 'block'
    dropdown.textContent = 'Searching...'
    try {
        const resp = await fetch('/reddit/subreddits/search.json?q=' + encodeURIComponent(query) + '&limit=8&include_over_18=true')
        const data = await resp.json()
        dropdown.textContent = ''
        if (!data?.data?.children?.length) {
            dropdown.textContent = 'No results'
            setTimeout(() => dropdown.style.display = 'none', 2000)
            return
        }
        for (const child of data.data.children) {
            const name = child.data.display_name
            const btn = document.createElement('button')
            btn.className = 'discover-item'
            btn.textContent = 'r/' + name + (child.data.over18 ? ' (NSFW)' : '')
            btn.onclick = () => {
                addSubredditValue(name)
                dropdown.style.display = 'none'
            }
            dropdown.appendChild(btn)
        }
    } catch(e) {
        dropdown.textContent = 'Search failed'
        setTimeout(() => dropdown.style.display = 'none', 2000)
    }
}

function fillProfiles() {
    const redditProfileString = localStorage.getItem("redditProfiles")
    if (redditProfileString) {
        const customGroup = profilePicker.querySelector('optgroup[label="Custom"]')
        const redditProfileNames = JSON.parse(redditProfileString).map(prof => prof.name)
        for (const profileName of redditProfileNames) {
            const option = document.createElement("option")
            option.setAttribute("value", profileName)
            option.innerText = profileName
            customGroup.appendChild(option)
        }
    }
}

export function initReddit() {
    pickedSubreddits = document.getElementById("pickedSubreddits")
    subredditInput = document.getElementById("subredditInput")
    subredditInput.onkeydown = function(e) { if (e.code == 'Enter') { addSubreddit() } }
    document.getElementById("subredditAdd").onclick = addSubreddit

    redditTimeContainer = document.getElementById("redditTimeContainer")
    document.getElementById("redditSort").onchange = changeSort

    profileTextInput = document.getElementById('profileNameInput')
    profilePicker = document.getElementById('profilePicker')
    profilePicker.onchange = profileChanged
    fillPresetCheckboxes()
    fillProfiles()

    // Discover button
    const discoverBtn = document.getElementById('subredditDiscover')
    if (discoverBtn) discoverBtn.onclick = discoverSubreddits
}
