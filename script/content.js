class Caption {
    constructor(url_id, start_time, end_time, text) {
        this.url_id = url_id
        this.start_time = start_time
        this.start_time_display = this.formatSecondsToTime(start_time)
        this.end_time = end_time
        this.text = text
    }

    formatSecondsToTime(seconds) {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.floor(seconds % 60)

        // 시간과 분을 2자리 숫자로 포맷팅
        const formattedMinutes = String(minutes).padStart(2, '0')
        const formattedSeconds = String(remainingSeconds).padStart(2, '0')

        return `${formattedMinutes}:${formattedSeconds}`
    }
}

console.log('content.js :: Top!!')

const URL = 'https://jsonplaceholder.typicode.com/users/1/posts'
const CONTENT_CAPTION_SAMPLE_PATH = "sample/caption-sample.json"
const CONTENT_HTML_PATH = 'html/content.html'
const CONTENT_CSS_PATH = 'css/content.css'

const YTD_WATCH_FLEXY_SECONDARY = 'ytd-watch-flexy[flexy] #secondary.ytd-watch-flexy'
const VIDEO_CONTAINER = '#movie_player > div.html5-video-container'
const VIDEO = '#movie_player > div.html5-video-container > video'

// 유튜브 홈페이지가 SPA(Single Page Application) 방식인 문제를 해결하기 위한 변수
// 유튜브 홈페이지 메인()에서 동영상 재생 페이지로 넘어갔을때를 MutationObserver와 url 변화로 감지함
let lastUrl = ''

let youtubeCaptions = []
let sttCaptions = []

async function showCtrlfContainer() {
    console.log('showCtrlfContainer()')

    addBoundingBoxOnYoutubeVideoContainer()

    await generateCtrlfContainer()

    const spinner = document.querySelector('.ctrlf-spinner')
    spinner.style.display = 'block'
    const scripts = await requestVideoScripts()
    spinner.style.display = 'none'

    await showCtrlfScripts(scripts)
}

function removeCtrlfContainer() {
    console.log('removeCtrlfContainer()')
    const container = document.getElementById('ctrlf')
    if (container != null) {
        container.parentElement.removeChild(container)
    }
}

function addBoundingBoxOnYoutubeVideoContainer() {
    const videoContainer = document.querySelector(VIDEO_CONTAINER)
    const video = document.querySelector(VIDEO)
    const rect = video.getBoundingClientRect()
    console.log(rect.width, rect.height, video.currentTime)

    const boundingBox = document.createElement('div')
    boundingBox.id = 'ctrlf-bounding-box'
    boundingBox.style.position = 'absolute'
    boundingBox.style.width = '100px'
    boundingBox.style.height = '40px'
    boundingBox.style.border = '4px solid red'
    // boundingBox.style.backgroundColor = 'rgba(255,255,0,0.7)'
    boundingBox.style.top = String(rect.height * 0.5) + 'px'
    boundingBox.style.left = String(rect.width * 0.5) + 'px'
    boundingBox.style.opacity = '0' // 처음에는 숨김

    videoContainer.append(boundingBox)
}

async function generateCtrlfContainer() {
    console.log('generateCtrlfContainer()')

    const html = await getHtml()
    const css = await getCss()

    // 유튜브 화면에서 오른쪽에 배치 된 컨텐츠
    const secondary = document.querySelector(YTD_WATCH_FLEXY_SECONDARY)
    console.log('secondary=' + secondary)

    // 'secondary' sideBar 의 첫 번째 자식 요소로 삽입
    secondary.insertAdjacentHTML('afterbegin', html)

    const rootContainer = secondary.firstElementChild
    const scrollView = document.getElementById('ctrlf-scroll-view')

    // Collapsible 버튼 이벤트
    const collapsibleButton = document.querySelector('.ctrlf-collapsible-button')
    collapsibleButton.addEventListener('click', toggleContent)

    // 검색 유형 라디오 버튼
    const radioOptions = document.querySelectorAll('.ctrlf-search-type-radio')
    radioOptions.forEach((radioOption) => {
        radioOption.addEventListener('click', () => {
            const selectedOption = document.querySelector('.ctrlf-search-type-radio:checked')
            console.log("onClick(): " + selectedOption.value)
            if (selectedOption) {
                if (selectedOption.value === 'stt') {
                    console.log("selectedOption.value === 'stt'")
                } else if (selectedOption.value === 'ocr') {
                    console.log("selectedOption.value === 'ocr'")
                }
            }
        })
    })

    // 검색어 인풋
    const searchInput = document.getElementById("ctrlf-search-input")
    searchInput.addEventListener("input", function () {
        const keyword = searchInput.value.trim().toLowerCase()

        let filteredCaptions
        if (keyword.length === 0) {
            filteredCaptions = youtubeCaptions
        } else {
            filteredCaptions = youtubeCaptions.filter(caption => {
                return caption.text.toLowerCase().includes(keyword)
            })
        }

        scrollView.innerHTML = ""
        filteredCaptions.forEach(caption => {
            const captionElement = createCaptionItemElement(caption)
            const captionTextElement = captionElement.querySelector('.ctrlf-text-p')
            highlightText(captionTextElement, keyword)
            scrollView.appendChild(captionElement)
        })
    })
}

function isHideContent() {
    const collapsibleIcon = document.querySelector('.ctrlf-collapsible-icon')
    const isActive = collapsibleIcon.classList.contains('active')
    return !isActive
}

function toggleContent() {
    // 토글 아이콘 회전
    const collapsibleIcon = document.querySelector('.ctrlf-collapsible-icon')
    collapsibleIcon.classList.toggle('active')

    // 컨텐츠 펼치기/접기
    const content = document.querySelector('.ctrlf-content')
    console.log('content: ' + content)
    console.log('content.style.maxHeight: ' + content.style.maxHeight)
    if (content.style.maxHeight) {
        content.style.maxHeight = null
    } else {
        content.style.maxHeight = content.scrollHeight + "px"
    }
}

async function requestVideoScripts() {
    console.log('requestVideoScripts() 1')
    await delay(3000)
    console.log('requestVideoScripts() 2')

    // const jsonObject = await getData()
    const jsonObject = await getSampleData()

    if (jsonObject != null) {
        youtubeCaptions = jsonObject.caption.map(item =>
            new Caption(item.url_id, item.start_time, item.end_time, item.text)
        )
    }

    return youtubeCaptions
}

async function getHtml() {
    return fetch(chrome.runtime.getURL(CONTENT_HTML_PATH))
        .then(response => response.text())
}

async function getCss() {
    return fetch(chrome.runtime.getURL(CONTENT_CSS_PATH))
        .then(response => response.text())
}

async function getData() {
    return fetch(URL)
        .then(response => response.json())
        .catch(logError)
}

async function getSampleData() {
    return fetch(chrome.runtime.getURL(CONTENT_CAPTION_SAMPLE_PATH))
        .then(response => response.json())
}

function showCtrlfScripts(scripts) {
    console.log('showCtrlfScripts()')
    console.log(scripts)

    const scrollView = document.getElementById('ctrlf-scroll-view')
    scrollView.innerHTML = ''

    // 목록 만들기
    for (let i = 0; i < scripts.length; i++) {
        const caption = scripts[i]
        const captionElement = createCaptionItemElement(caption)

        scrollView.append(captionElement)
    }

    // 토글 버튼이 접혀져있는 경우 다시 펼치기
    if (isHideContent()) {
        toggleContent()
    }
}

function createCaptionItemElement(caption) {
    // Row div
    const row = document.createElement('div')
    row.className = 'ctrlf-row'

    // 타임스탬프
    const timeDiv = document.createElement('div')
    timeDiv.className = 'ctrlf-time-div'
    const timeP = document.createElement('p')
    timeP.className = 'ctrlf-time-p'
    timeP.innerText = caption.start_time_display
    timeDiv.append(timeP)
    row.append(timeDiv)

    // 스크립트
    const textDiv = document.createElement('div')
    textDiv.className = 'ctrlf-text-div'
    const textP = document.createElement('p')
    textP.className = 'ctrlf-text-p'
    textP.innerText = caption.text
    textDiv.append(textP)

    // 클릭 이벤트
    row.addEventListener('click', () => {
        const video = document.querySelector(VIDEO)
        console.log('video=' + video)
        video.currentTime = caption.start_time

        showBoundingBox(caption)
    })

    row.append(timeDiv)
    row.append(textDiv)

    return row
}

function showBoundingBox(caption) {
    console.log(`showBoundingBoxWhenMouseOver(): ${caption.start_time}`)
    const video = document.querySelector(VIDEO)
    const videoRect = video.getBoundingClientRect()
    const boundingBox = document.getElementById('ctrlf-bounding-box')
    console.log(boundingBox)

    // show
    boundingBox.style.transition = 'none'
    boundingBox.style.top = `${videoRect.height * Math.random()}px`
    boundingBox.style.left = `${videoRect.width * Math.random()}px`
    boundingBox.style.opacity = '1'
    console.log(boundingBox)

    setTimeout(() => {
        // hide
        boundingBox.style.transition = 'opacity 1s ease-out 2s'
        boundingBox.style.opacity = '0'
        console.log(boundingBox)
    }, 100)
}

function highlightText(textElement, targetText) {
    const textContent = textElement.textContent
    const startIndex = textContent.toLowerCase().indexOf(targetText.toLowerCase())

    if (startIndex !== -1) {
        const endIndex = startIndex + targetText.length
        const highlightedText = textContent.slice(0, startIndex) +
            `<span class="ctrlf-highlight-text">${textContent.slice(startIndex, endIndex)}</span>` +
            textContent.slice(endIndex);
        textElement.innerHTML = highlightedText;
    }
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function logError(error) {
    console.log(error)
}

const observer = new MutationObserver((mutations) => {
    if (lastUrl !== location.href) {
        lastUrl = location.href
        console.log('lastUrl=' + lastUrl)

        if (lastUrl.includes('https://www.youtube.com/watch')) {
            showCtrlfContainer()
        } else {
            removeCtrlfContainer()
        }
    }
})
observer.observe(document.getElementById('page-manager'), { childList: true, subtree: true })

console.log('content.js :: Bottom!!')