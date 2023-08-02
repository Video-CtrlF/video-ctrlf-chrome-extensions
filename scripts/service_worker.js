const BASE_URL = 'http://43.201.249.208'
const SAMPLE_VIDEO_SCRIPTS_URL = 'samples/subark-ssim-90-v2-response.json'

const API_GET_URL_EXISTS = '/api/check-existence'
const API_POST_CAPTIONS = '/api/captions/'
const API_GET_STATUS = '/api/status'
const API_POST_AI_INFERENCE = '/api/ai/'
const API_GET_AI_RESULT = '/api/ai/result'

console.log('service_worker.js')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`service_worker :: request.type=${request.type}`)

    switch (request.type) {
        case 'get-url-exists':
            requestVideoScriptsExistsByAi(request.data.url, sendResponse)
            return true
        case 'get-youtube-scripts':
            requestVideoScriptsByYoutube(request.data.url, sendResponse)
            return true
        case 'get-ai-status':
            checkAiInferenceStatus(request.data.url, sendResponse)
            return true
        case 'post-ai-inference':
            requestAiInferenceVideoSctips(request.data.url, sendResponse)
            return true
        case 'get-ai-result':
            requestVideoScriptsByAi(request.data.url, sendResponse)
            return true
    }
    return false
})

/**
 * AI 인퍼런스 결과가 서버에 존재하는지 여부를 요청
 * 
 * @param {string} youtubeUrl 유튜브 동영상 URL
 * @param {*} sendResponse 콜백 함수
 */
function requestVideoScriptsExistsByAi(youtubeUrl, sendResponse) {
    const queryParams = {
        url: youtubeUrl
    }
    fetch(makeUrl(BASE_URL, API_GET_URL_EXISTS, queryParams))
        .then(response => response.json())
        .then(json => { sendResponse(json.isExist) })
        .catch(logError)
}

/**
 * 동영상 음성 자막 요청 (유튜브에서 제공하는 자막)
 * 
 * @param {string} youtubeUrl 유튜브 동영상 URL
 * @param {*} sendResponse 콜백 함수
 */
function requestVideoScriptsByYoutube(youtubeUrl, sendResponse) {
    fetch(makeUrl(BASE_URL, API_POST_CAPTIONS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ 'url': youtubeUrl })
    })
        .then(response => response.json())
        .then(json => sendResponse(json))
        .catch(logError)
}

/**
 * AI 인퍼런스 서버 상태 체크
 * 
 * [Response]
 * - created : 생성만 됨 (default)
 * - process : inference 진행 중
 * - success : inference 성공(완료)
 * - fail : inference 실패(중단 됨)
 * 
 * @param {string} youtubeUrl 유튜브 동영상 URL
 * @param {*} sendResponse 콜백 함수
 */
function checkAiInferenceStatus(youtubeUrl, sendResponse) {
    const queryParams = {
        url: youtubeUrl
    }
    fetch(makeUrl(BASE_URL, API_GET_STATUS, queryParams))
        .then(response => response.json())
        .then(json => { sendResponse(json.status) })
        .catch(logError)
}

/**
 * 동영상 스크립트 AI 인퍼런스 요청
 * 
 * [Response]
 * - created : 생성만 됨 (default)
 * - process : inference 진행 중
 * - success : inference 성공(완료)
 * - fail : inference 실패(중단 됨)
 * 
 * @param {string} youtubeUrl 유튜브 동영상 URL
 * @param {*} sendResponse 콜백 함수
 */
function requestAiInferenceVideoSctips(youtubeUrl, sendResponse) {
    fetch(makeUrl(BASE_URL, API_POST_AI_INFERENCE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'url': youtubeUrl })
    })
        .then(response => response.json())
        .then(json => { sendResponse(json.status) })
        .catch(logError)
}

/**
 * AI 인퍼런스 결과 스크립트 요청
 * 
 * @param {string} youtubeUrl 유튜브 동영상 URL
 * @param {*} sendResponse 콜백 함수
 */
function requestVideoScriptsByAi(youtubeUrl, sendResponse) {
    const queryParams = {
        url: youtubeUrl
    }
    fetch(makeUrl(BASE_URL, API_GET_AI_RESULT, queryParams), {
        method: 'GET'
    })
        .then(response => response.json())
        .then(json => { sendResponse(json) })
        .catch(logError)
}

function makeUrl(baseUrl, apiEndPoint, queryParams) {
    const url = `${baseUrl}${apiEndPoint}`
    if (queryParams) {
        const queryString = Object.keys(queryParams)
            .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
            .join('&')
        return url + '?' + queryString
    } else {
        return url
    }
}

function logError(error) {
    console.log(error)
}