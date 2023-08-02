console.log('content.js :: Top!!')

class ScriptResponse {
    constructor(jsonObject) {
        this.info = new VideoInfo(jsonObject.info)

        // 키워드
        if (jsonObject.STTkeywords) {
            this.stt_keywords = jsonObject.STTkeywords.slice(0, 10) // 10 개만 추출
        } else if (jsonObject.keywords) { // 유튜브 스크립트인 경우의 키워드
            this.stt_keywords = jsonObject.keywords.slice(0, 10) // 10 개만 추출
        }
        if (jsonObject.OCRkeywords) {
            this.ocr_keywords = jsonObject.OCRkeywords.slice(0, 10) // 10 개만 추출
        }

        // 스크립트
        if (jsonObject.scripts && jsonObject.scripts.STT) {
            this.stt_scripts = jsonObject.scripts.STT.map(scriptJson => {
                return STTScript.jsonFrom(scriptJson)
            })
        } else if (jsonObject.caption) { // 유튜브 스크립트인 경우
            this.stt_scripts = jsonObject.caption.map(scriptJson => {
                return STTScript.jsonFrom(scriptJson)
            })
        }
        if (jsonObject.scripts && jsonObject.scripts.OCR) {
            this.ocr_scripts = jsonObject.scripts.OCR.map(scriptJson => {
                return OCRScript.jsonFrom(scriptJson)
            })
        }
    }
}

class VideoInfo {
    constructor(info) {
        this.url_id = info.url_id
        this.title = info.title
        this.length = info.length
        this.video_size = info.video_size
    }
}

class VideoSize {
    constructor(size) {
        this.width = size.width
        this.height = size.height
    }
}

class STTScript {
    constructor(start_time, end_time, text) {
        this.start_time = parseFloat(start_time)
        this.start_time_display = formatSecondsToTime(parseFloat(start_time))
        this.end_time = parseFloat(end_time)
        this.text = text.trim()
    }

    static jsonFrom(sttScriptJson) {
        return new STTScript(
            parseFloat(sttScriptJson.start_time),
            parseFloat(sttScriptJson.end_time),
            sttScriptJson.text.trim()
        )
    }
}

class OCRScript {
    constructor(start_time, text, conf, bbox) {
        this.start_time = parseFloat(start_time)
        this.start_time_display = formatSecondsToTime(parseFloat(start_time))
        this.text = text.trim()
        this.conf = conf
        this.bbox = bbox
    }

    static jsonFrom(ocrScriptJson) {
        return new OCRScript(
            parseFloat(ocrScriptJson.time),
            ocrScriptJson.text.trim(),
            ocrScriptJson.conf,
            new OCRBoundingBox(ocrScriptJson.bbox)
        )
    }
}

class OCRBoundingBox {
    constructor(bbox) {
        this.top_left_x = bbox.tl[0]
        this.top_left_y = bbox.tl[1]
        this.top_right_x = bbox.tr[0]
        this.top_right_y = bbox.tr[1]
        this.bottom_left_x = bbox.bl[0]
        this.bottom_left_y = bbox.bl[1]
        this.bottom_right_x = bbox.br[0]
        this.bottom_right_y = bbox.br[1]
    }
}

/**
 * 문자열 <초>를 <분>:<초> 포맷으로 변경해주는 함수
 * 
 * @param {string} seconds 초 (ex 62.1294)
 * @returns <분>:<초> (ex '01:02')
 */
function formatSecondsToTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    // 시간과 분을 2자리 숫자로 포맷팅
    const formattedMinutes = String(minutes).padStart(2, '0')
    const formattedSeconds = String(remainingSeconds).padStart(2, '0')

    return `${formattedMinutes}:${formattedSeconds}`
}

const SAMPLE_VIDEO_SCRIPTS_URL = 'samples/subak-ssim-90-v2-response.json'
const CONTENT_HTML_PATH = 'html/content.html'
const CONTENT_CSS_PATH = 'css/content.css'

const YTD_WATCH_FLEXY_SECONDARY = 'ytd-watch-flexy[flexy] #secondary.ytd-watch-flexy'
const VIDEO_CONTAINER = '#movie_player > div.html5-video-container'
const VIDEO = '#movie_player > div.html5-video-container > video'

// 유튜브 홈페이지가 SPA(Single Page Application) 방식인 문제를 해결하기 위한 변수
// 유튜브 홈페이지 메인()에서 동영상 재생 페이지로 넘어갔을때를 MutationObserver와 url 변화로 감지함
let lastUrl = ''

let response = null
let filteredSttScripts = []
let filteredOcrScripts = []

/**
 * 현재 선택된 검색 옵션
 * @return string : 'stt' or 'ocr'
 * */
function currentSearchOption() {
    const selectedRadioOption = document.querySelector('.ctrlf-search-type-radio:checked')
    return selectedRadioOption.value
}

/**
 * 동영상 Ctrl+F 시작
 * */
async function startVideoCtrlF() {
    // console.log('startVideoCtrlF()')

    // Video 태그 컨테이너에 바운딩 박스 엘리먼트 생성 (초기에는 숨김 상태)
    addBoundingBoxOnYoutubeVideoContainer()

    // Ctrl+F 컨테이너 및 엘리먼트 생성
    await generateCtrlfContainer()

    // 로딩 스피너 (20초)
    showLoadingSpinner(20000)

    // 동영상 스크립트 불러오기
    loadVideoScripts(location.href)
    // getSampleVideoScripts()
}

/**
 * 유튜브 Video 엘리먼트의 크기에 맞게 Ctrl+F 컨테이너 높이 조정
 * CtrlfContainer 높이 = 타이틀 헤더를 제외한 나머지 높이
 */
function adjustCtrlfContentHeight() {
    const videoElementHeight = document.querySelector(VIDEO)
        .getBoundingClientRect()
        .height
    const headerHeight = document.querySelector('.ctrlf-header')
        .getBoundingClientRect()
        .height
    const keywordsHeight = document.querySelector('.ctrlf-keywords-container')
        .getBoundingClientRect()
        .height
    const footerHeight = document.querySelector('.ctrlf-footer')
        .getBoundingClientRect()
        .height

    // 자막 높이 = 유튜브 Video 높이 - (헤더 + 키워드 + 검색푸터)
    const scriptsHeight = videoElementHeight - (headerHeight + keywordsHeight + footerHeight)

    const scriptsContainer = document.querySelector('.ctrlf-script-container')
    scriptsContainer.style.height = scriptsHeight + 'px'
}

/**
 * 동영상 Ctrl+F 제거.
 * */
function removeVideoCtrlf() {
    // console.log('removeCtrlfContainer()')
    const container = document.getElementById('ctrlf')
    if (container != null) {
        container.parentElement.removeChild(container)
    }
}

/**
 * 바운딩 박스 삽입.
 * 유튜브 페이지에서 Video 태그가 담긴 Container 에 바운딩 박스 엘리먼트를 삽입한다
 * 처음에는 opacity = 0 으로 보이지 않음
 * */
function addBoundingBoxOnYoutubeVideoContainer() {
    const videoContainer = document.querySelector(VIDEO_CONTAINER)
    const video = document.querySelector(VIDEO)
    const rect = video.getBoundingClientRect()

    const boundingBox = document.createElement('div')
    boundingBox.id = 'ctrlf-bounding-box'
    boundingBox.style.position = 'absolute'
    boundingBox.style.width = '100px'
    boundingBox.style.height = '40px'
    boundingBox.style.border = '6px solid red'
    // boundingBox.style.backgroundColor = 'rgba(255,255,0,0.7)'
    boundingBox.style.top = String(rect.height * 0.5) + 'px'
    boundingBox.style.left = String(rect.width * 0.5) + 'px'
    boundingBox.style.opacity = '0' // 처음에는 숨김

    videoContainer.append(boundingBox)
}

/**
 * Ctrl+F 컨테이너 생성.
 * */
async function generateCtrlfContainer() {
    // console.log('generateCtrlfContainer()')

    const html = await getHtml()
    const css = await getCss()

    // 유튜브 화면에서 오른쪽에 배치 된 컨텐츠
    const secondary = document.querySelector(YTD_WATCH_FLEXY_SECONDARY)

    // 'secondary' sideBar 의 첫 번째 자식 요소로 삽입
    secondary.insertAdjacentHTML('afterbegin', html)

    const rootContainer = secondary.firstElementChild
    const scriptContainer = document.getElementById('ctrlf-script-container')

    // Collapsible 버튼 이벤트
    const collapsibleButton = document.querySelector('.ctrlf-collapsible-button')
    collapsibleButton.addEventListener('click', toggleContent)

    // 검색 유형 라디오 버튼
    const radioOptions = document.querySelectorAll('.ctrlf-search-type-radio')
    radioOptions.forEach((radioOption) => {
        radioOption.addEventListener('click', () => {
            const selectedOption = document.querySelector('.ctrlf-search-type-radio:checked')
            if (selectedOption) {
                if (selectedOption.value === 'stt' && response.stt_keywords) {
                    showKeywords(response.stt_keywords)
                    showCtrlfScripts(filteredSttScripts)
                } else if (selectedOption.value === 'ocr' && response.ocr_keywords) {
                    showKeywords(response.ocr_keywords)
                    showCtrlfScripts(filteredOcrScripts)
                }
            }
        })
    })

    // 검색어 입력 박스
    const searchInput = document.getElementById("ctrlf-search-input")
    searchInput.addEventListener("input", function () {
        const keyword = searchInput.value.trim().toLowerCase()

        if (keyword.length === 0) {
            if (response.stt_scripts) {
                filteredSttScripts = response.stt_scripts
            }
            if (response.ocr_scripts) {
                filteredOcrScripts = response.ocr_scripts
            }
        } else {
            if (response.stt_scripts) {
                filteredSttScripts = response.stt_scripts.filter(script => {
                    return script.text.toLowerCase().includes(keyword)
                }).map(script => {
                    return new STTScript(script.start_time, script.end_time, highlightText(script.text, keyword))
                })
            }
            if (response.ocr_keywords) {
                filteredOcrScripts = response.ocr_scripts.filter(script => {
                    return script.text.toLowerCase().includes(keyword)
                }).map(script => {
                    return new OCRScript(script.start_time, highlightText(script.text, keyword), script.conf, script.bbox)
                })
            }
        }

        let filteredScripts
        if (currentSearchOption() === 'stt') {
            filteredScripts = filteredSttScripts
        } else {
            filteredScripts = filteredOcrScripts
        }
        scriptContainer.innerHTML = ''
        filteredScripts.forEach(script => {
            const scriptElement = createScriptItemElement(script)
            scriptContainer.appendChild(scriptElement)
        })
    })
}

/**
 * 스크립트 목록이 접혀있는지 여부.
 * @return boolean
 * */
function isHideScripts() {
    const collapsibleIcon = document.querySelector('.ctrlf-collapsible-icon')
    const isActive = collapsibleIcon.classList.contains('active')
    return !isActive
}

/**
 * 헤더의 토글(접기/펼치기) 버튼 동작 함수.
 * */
function toggleContent() {
    if (response === null || response === undefined) {
        return
    }
    // 토글 아이콘 회전
    const collapsibleIcon = document.querySelector('.ctrlf-collapsible-icon')
    collapsibleIcon.classList.toggle('active')

    // 컨텐츠 펼치기/접기
    const content = document.querySelector('.ctrlf-content')
    if (content.style.maxHeight) {
        content.style.maxHeight = null
    } else {
        content.style.maxHeight = content.scrollHeight + 'px'
    }
}

/**
 * 로딩 스피너 보여주기.
 * @param {number} duration 해당 시간(밀리초)이 지나면 사라짐
 */
function showLoadingSpinner(duration) {
    const spinner = document.querySelector('.ctrlf-spinner')
    spinner.style.display = 'block'
    if (duration) {
        setTimeout(hideLoadingSpinner, duration)
    }
}

/**
 * 로딩 스피너 숨기기.
 */
function hideLoadingSpinner() {
    const spinner = document.querySelector('.ctrlf-spinner')
    spinner.style.display = 'none'
}

/**
 * 검색 옵션 숨기기
 */
function hideSearchOptions() {
    const searchOption = document.querySelector('.ctrlf-footer-radio')
    searchOption.style.display = 'none'
}

/**
 * Ctrl+F Html 문자열 가져오기.
 * @return string
 * */
async function getHtml() {
    return fetch(chrome.runtime.getURL(CONTENT_HTML_PATH))
        .then(response => response.text())
}

/**
 * Ctrl+F Css 문자열 가져오기
 * @return string
 * */
async function getCss() {
    return fetch(chrome.runtime.getURL(CONTENT_CSS_PATH))
        .then(response => response.text())
}

/**
 * 동영상 스크립트 불러오기
 * 서버에 AI 스크립트가 있으면 그것을, 아니면 유튜브 자막을 요청함
 * */
function loadVideoScripts(youtubeUrl) {
    console.log('loadVideoScripts(): ' + youtubeUrl)

    // 서버에 URL 정보 존재하는지 요청
    requestYoutubeUrlExistence(youtubeUrl, (isExists) => {
        if (isExists) { // 있으면
            // AI 스크립트 요청
            requestVideoScriptsByAiModel(youtubeUrl)
        } else { // 없으면
            // 유튜브 자막 요청
            requestVideoScriptsByYoutube(youtubeUrl)
            
            // AI 인퍼런스 상태 요청
            requestAiInferenceStatus(youtubeUrl, (status) => {
                if (status !== 'success') { // 완료가 아니면
                    // AI 인퍼런스 요청
                    requestAiInferenceVideoScripts(youtubeUrl)
                }
            })
        }
    })
}

/**
 * URL이 서버 DB에 생성되었는지 확인
 */
function requestYoutubeUrlExistence(youtubeUrl, callback) {
    const request = {
        'type': 'get-url-exists',
        'data': { 'url': youtubeUrl }
    }
    sendMessageToSeviceWorker(request, callback)
}

/**
 * 서버에 AI 인퍼런스 상태 체크
 */
function requestAiInferenceStatus(youtubeUrl, callback) {
    const request = {
        'type': 'get-ai-status',
        'data': { 'url': youtubeUrl }
    }
    sendMessageToSeviceWorker(request, callback)
}

/**
 * 서버에 동영상 스크립트 요청 (유튜브 자막)
 */
function requestVideoScriptsByYoutube(youtubeUrl) {
    const request = {
        'type': 'get-youtube-scripts',
        'data': { 'url': youtubeUrl }
    }
    sendMessageToSeviceWorker(request, responseJson => {
        showCtrlfContents(responseJson)
        hideLoadingSpinner()

        // Ctrl+F 컨테이너 높이 조정
        adjustCtrlfContentHeight()
    })
}

/**
 * 서버에 AI 인퍼런스 요청
 */
function requestAiInferenceVideoScripts(youtubeUrl) {
    const request = {
        'type': 'post-ai-inference',
        'data': { 'url': youtubeUrl }
    }
    sendMessageToSeviceWorker(request, responseJson => {
        console.log('requestAiInferenceVideoScripts()')
    })
}

/**
 * 서버에 동영상 스크립트 요청 (AI 인퍼런스)
 */
function requestVideoScriptsByAiModel(youtubeUrl) {
    const request = {
        'type': 'get-ai-result',
        'data': { 'url': youtubeUrl }
    }
    sendMessageToSeviceWorker(request, responseJson => {
        showCtrlfContents(responseJson)
        hideLoadingSpinner()

        // Ctrl+F 컨테이너 높이 조정
        adjustCtrlfContentHeight()
    })
}

/**
 * 동영상 Ctrlf 컨텐츠 보여주기
 */
function showCtrlfContents(responseJson) {
    response = new ScriptResponse(responseJson)

    if (response.stt_scripts) {
        filteredSttScripts = response.stt_scripts
    } else {
        hideSearchOptions()
    }
    if (response.ocr_scripts) {
        filteredOcrScripts = response.ocr_scripts
    } else {
        hideSearchOptions()
    }

    if (currentSearchOption() === 'stt') {
        showKeywords(response.stt_keywords)
        showCtrlfScripts(filteredSttScripts)
    } else {
        showKeywords(response.ocr_keywords)
        showCtrlfScripts(filteredOcrScripts)
    }
}



/**
 * 샘플 동영상 스크립트 가져오기
 */
function getSampleVideoScripts() {
    fetch(chrome.runtime.getURL(SAMPLE_VIDEO_SCRIPTS_URL))
        .then(response => response.json())
        .then(json => {
            response = new ScriptResponse(json)

            filteredSttScripts = response.stt_scripts
            filteredOcrScripts = response.ocr_scripts

            if (currentSearchOption() === 'stt') {
                showKeywords(response.stt_keywords)
                showCtrlfScripts(filteredSttScripts)
            } else {
                showKeywords(response.ocr_keywords)
                showCtrlfScripts(filteredOcrScripts)
            }

            hideLoadingSpinner()
        })
        .catch(logError)
}

/**
 * service_worker.js 로 네크워크 통신 요청 및 응답
 * 
 * @param {dict} request 요청 객체
 * @param {*} response 응답 콜백 함수
 */
function sendMessageToSeviceWorker(request, response) {
    chrome.runtime.sendMessage(request, response)
}

/**
 * 핵심 키워드 보여주기.
 * */
function showKeywords(keywords) {
    const keywordContainer = document.querySelector('.ctrlf-keywords-sub-container')
    keywordContainer.innerHTML = ''

    for (const keyword of keywords) {
        const keywordElement = document.createElement('p')
        keywordElement.className = 'ctrlf-keywords-p'
        keywordElement.innerText = `#${keyword}`
        keywordElement.addEventListener('click', () => {
            const searchInput = document.getElementById("ctrlf-search-input")
            searchInput.value = keyword

            // input 이벤트를 수동으로 생성하고 발생시킵니다.
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            searchInput.dispatchEvent(inputEvent);
        })
        keywordContainer.appendChild(keywordElement)
    }
}

/**
 * 스크립트 보여주기.
 * */
function showCtrlfScripts(scripts) {
    // console.log('showCtrlfScripts()')

    const scriptContainer = document.getElementById('ctrlf-script-container')
    scriptContainer.innerHTML = ''

    // 목록 만들기
    for (let i = 0; i < scripts.length; i++) {
        const caption = scripts[i]
        const captionElement = createScriptItemElement(caption)

        scriptContainer.append(captionElement)
    }

    // 토글 버튼이 접혀져있는 경우 다시 펼치기
    if (isHideScripts()) {
        toggleContent()
    }
}

/**
 * 스크립트 목록 아이템 생성.
 * */
function createScriptItemElement(script) {
    // console.log(`createScriptItemElement(): ${script}`)
    // Row div
    const row = document.createElement('div')
    row.className = 'ctrlf-row'

    // 타임스탬프
    const timeDiv = document.createElement('div')
    timeDiv.className = 'ctrlf-time-div'
    const timeP = document.createElement('p')
    timeP.className = 'ctrlf-time-p'
    timeP.innerText = script.start_time_display
    timeDiv.append(timeP)
    row.append(timeDiv)

    // 스크립트
    const textDiv = document.createElement('div')
    textDiv.className = 'ctrlf-text-div'
    const textP = document.createElement('p')
    textP.className = 'ctrlf-text-p'
    // textP.innerText = scripts.text
    textP.innerHTML = script.text
    textDiv.append(textP)

    // 클릭 이벤트
    row.addEventListener('click', () => {
        const video = document.querySelector(VIDEO)
        video.currentTime = script.start_time

        // OCR Script 인 경우 바운딩 박스 보여주기
        if (script instanceof OCRScript) {
            showBoundingBox(script)
        }
    })

    row.append(timeDiv)
    row.append(textDiv)

    return row
}

/**
 * 바운딩 박스 보여주기.
 * */
function showBoundingBox(script) {
    // console.log(`showBoundingBoxWhenMouseOver(): ${scripts.start_time}`)
    const video = document.querySelector(VIDEO)
    const videoRect = video.getBoundingClientRect()
    const boundingBox = document.getElementById('ctrlf-bounding-box')

    // show
    const bbox = script.bbox
    boundingBox.style.top = `${videoRect.height * bbox.top_left_y}px`
    boundingBox.style.left = `${videoRect.width * bbox.top_left_x}px`
    boundingBox.style.width = `${videoRect.width * (bbox.top_right_x - bbox.top_left_x)}px`
    boundingBox.style.height = `${videoRect.height * (bbox.bottom_left_y - bbox.top_left_y)}px`
    boundingBox.style.transition = 'none'
    boundingBox.style.opacity = '1'

    setTimeout(() => {
        // hide
        boundingBox.style.transition = 'opacity 1s ease-out 2s'
        boundingBox.style.opacity = '0'
    }, 100)
}

/**
 * 문자열에 하이라이팅(배경색) 효과 주기.
 * @return string : 하이라이팅이 적용된 문자열 반환
 * */
function highlightText(text, keyword) {
    const startIndex = text.toLowerCase().indexOf(keyword.toLowerCase())

    if (startIndex !== -1) {
        const endIndex = startIndex + keyword.length
        const highlightedText = text.slice(0, startIndex) +
            `<span class="ctrlf-highlight-text">${text.slice(startIndex, endIndex)}</span>` +
            text.slice(endIndex);

        return highlightedText
    } else {
        return text
    }
}

function logError(error) {
    console.log(error)
}

// SPA 방식에서 url 변화를 감지.
// 유튜브 동영상 재생 페이지에서만 Ctrl+F 서비스를 작동하기 위함.
const observer = new MutationObserver((mutations) => {
    if (lastUrl !== location.href) {
        lastUrl = location.href
        console.log('lastUrl=' + lastUrl)

        if (lastUrl.includes('https://www.youtube.com/watch')) {
            startVideoCtrlF()
        } else {
            removeVideoCtrlf()
        }
    }
})

// 컴포넌트마다 로딩 속도가 다르거나, 
// SPA의 경우 DOMContentLoaded 시점에도 로딩되지 않은 컴포넌트가 있는 경우를 위한 해결 방안.
const intervalForBackgroundChange = () => {
    const pageManager = document.getElementById('page-manager')
    
    if (pageManager) {
        clearInterval(intervalForBackgroundChange);
        observer.observe(pageManager, { childList: true, subtree: true })
    }
}
document.onload = setInterval(intervalForBackgroundChange, 100)

// chrome.runtime.onInstalled.addListener(details => {
//     console.log('chrome.runtime.onInstalled')
//     console.log(details)
//     if (details === 'install') {
//         setInterval(intervalForBackgroundChange, 100)
//     }
// })

console.log('content.js :: End!!')