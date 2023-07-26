class Caption {
    constructor(url_id, start_time, end_time, text) {
        this.url_id = url_id;
        this.start_time = start_time;
        this.start_time_display = this.formatSecondsToTime(start_time)
        this.end_time = end_time;
        this.text = text;
    }

    formatSecondsToTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        // 시간과 분을 2자리 숫자로 포맷팅
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');

        return `${formattedMinutes}:${formattedSeconds}`;
    }
}

const URL = 'https://jsonplaceholder.typicode.com/users/1/posts'
const CONTENT_CAPTION_SAMPLE_PATH = "sample/caption-sample.json"
const CONTENT_HTML_PATH = 'html/content.html'
const CONTENT_CSS_PATH = 'css/content.css'

console.log('content.js :: Top!!')

async function loadData() {
    console.log('loadData()')

    const html = await getHtml()
    const css = await getCss()
    // const jsonObject = await getData()
    const jsonObject = await getSampleData()

    if (html != null && css != null && jsonObject != null) {
        const captions = jsonObject.caption.map(item =>
            new Caption(item.url_id, item.start_time, item.end_time, item.text)
        );
        showData(html, css, captions)
    } else {
        console.log(html, css, jsonObject)
    }
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

function showData(html, css, captions) {
    console.log("showData()")
    console.log(captions)

    // 유튜브 화면에서 오른쪽에 배치 된 컨텐츠
    const rightContents = document.getElementById('secondary')

    // 'secondary' sideBar 의 첫 번째 자식 요소로 삽입
    rightContents.insertAdjacentHTML('afterbegin', html)
    const rootContainer = rightContents.firstElementChild
    const scrollView = document.getElementById('ctrlf-scroll-view')

    // 목록 만들기
    for (let i = 0; i < captions.length; i++) {
        const caption = captions[i]

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

        row.append(timeDiv)
        row.append(textDiv)
        scrollView.append(row)
    }
}

function logError(error) {
    console.log(error)
}

setTimeout(loadData, 1000) // 1초 뒤에 실행
// document.addEventListener('DOMContentLoaded', loadData)

console.log('content.js :: Bottom!!')