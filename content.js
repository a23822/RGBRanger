// ===== 1. SVG 필터 정의 (기존과 동일) =====
function injectSvgFilters() {
    if (document.getElementById('rgbranger-svg-filters')) return;
    const svgFilters = `
        <svg id="rgbranger-svg-filters" style="position: absolute; height: 0; width: 0;">
            <defs>
                <filter id="deuteranopia-correct-filter"><feColorMatrix type="matrix" values="0.625 0.375 0 0 0, 0.7 0.3 0 0 0, 0 0.3 0.7 0 0, 0 0 0 1 0" /></filter>
                <filter id="protanopia-correct-filter"><feColorMatrix type="matrix" values="0.567 0.433 0 0 0, 0.558 0.442 0 0 0, 0 0.242 0.758 0 0, 0 0 0 1 0" /></filter>
                <filter id="tritanopia-correct-filter"><feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, -0.867 1.867 0 0 0, 0 0 0 1 0" /></filter>
                
                <filter id="deuteranopia-sim-filter"><feColorMatrix type="matrix" values="1 0 0 0 0, 0.4942 0 1.2482 0 0, 0 0 1 0 0, 0 0 0 1 0" /></filter>
                <filter id="protanopia-sim-filter"><feColorMatrix type="matrix" values="0 2.0234 -2.5258 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 1 0" /></filter>
                <filter id="tritanopia-sim-filter"><feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0.433 0.567 0 0, 0 0 0 1 0" /></filter>
                <filter id="achromatopsia-sim-filter"><feColorMatrix type="matrix" values="0.299 0.587 0.114 0 0, 0.299 0.587 0.114 0 0, 0.299 0.587 0.114 0 0, 0 0 0 1 0" /></filter>
            </defs>
        </svg>
    `;
    document.body.insertAdjacentHTML('afterbegin', svgFilters);
}

// ===== 2. 상태 변수 및 기능 함수 =====
let lastAnalysisType = null; // 마지막으로 AI 분석을 실행한 색맹 유형
let isSimulatingCorrected = false; // 보정 후 체험 모드 활성화 여부

function updatePopupStatus(message) {
    chrome.runtime.sendMessage({ action: "update_status", message: message });
}

function resetAll() {
    isSimulatingCorrected = false;
    lastAnalysisType = null;
    document.documentElement.style.filter = '';
    document.querySelectorAll('[data-rgbranger-corrected]').forEach(el => {
        el.style.filter = '';
        el.removeAttribute('data-rgbranger-corrected');
    });
    updatePopupStatus('상태: 초기화 완료');
}

function simulateView(type) {
    resetAll();
    const filterId = `${type}-sim-filter`;
    document.documentElement.style.filter = `url(#${filterId})`;
    updatePopupStatus(`상태: ${type} 체험 중`);
}

async function analyzeAndCorrect(type) {
    resetAll();
    if (type === 'achromatopsia') {
        alert('전색맹은 AI 보정 대신 시각 체험을 실행합니다.');
        simulateView(type);
        return;
    }
    lastAnalysisType = type;
    const session = await initializeAI();
    if (session) {
        const elements = document.querySelectorAll('body *');
        await Promise.all(Array.from(elements).map(el => analyzeElement(session, el, type)));
        updatePopupStatus(`상태: ${type} 보정 완료`);
    } else {
        updatePopupStatus('상태: AI 초기화 실패');
    }
}

function toggleVerify(type) {
    if (!lastAnalysisType) {
        alert('먼저 AI 보정(2번 버튼)을 실행해주세요.');
        updatePopupStatus('상태: 보정 먼저 실행 필요');
        return;
    }
    if (lastAnalysisType !== type) {
        alert(`현재 보정된 유형은 '${lastAnalysisType}'입니다. 같은 유형을 선택하고 다시 시도해주세요.`);
        updatePopupStatus('상태: 보정 유형 불일치');
        return;
    }

    isSimulatingCorrected = !isSimulatingCorrected; // 상태 반전

    if (isSimulatingCorrected) {
        // 체험 모드 켜기
        const filterId = `${type}-sim-filter`;
        document.documentElement.style.filter = `url(#${filterId})`;
        updatePopupStatus('상태: 보정 후 체험 (ON)');
    } else {
        // 체험 모드 끄기 (AI 보정 상태는 유지)
        document.documentElement.style.filter = '';
        updatePopupStatus('상태: 보정 후 체험 (OFF)');
    }
}

// ===== 3. AI 관련 헬퍼 함수 (기존과 동일) =====
async function initializeAI() { /* ... 기존 코드 ... */ }
async function analyzeElement(session, element, colorblindType) { /* ... 기존 코드 ... */ }

// ===== 4. 메시지 리스너 (toggleVerify 케이스 추가) =====
if (!window.rgbrangerListener) {
    window.rgbrangerListener = true;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        injectSvgFilters();
        switch (request.action) {
            case 'simulate':
                simulateView(request.type);
                break;
            case 'analyze':
                analyzeAndCorrect(request.type);
                break;
            case 'toggleVerify': // --- ✨ 새로운 액션 처리 ---
                toggleVerify(request.type);
                break;
            case 'reset':
                resetAll();
                break;
        }
        sendResponse({ status: "Action received" });
        return true;
    });
}