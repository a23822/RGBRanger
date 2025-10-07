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
let lastAnalysisType = null;
let isSimulatingCorrected = false;

function updatePopupStatus(message) {
    // 1. 팝업이 열려있다면 즉시 업데이트하도록 메시지 전송
    chrome.runtime.sendMessage({ action: "update_status", message: message });
    // 2. 팝업이 닫혀있어도 상태를 기억하도록 chrome.storage에 저장
    chrome.storage.local.set({ currentStatus: message });
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
    chrome.storage.local.set({ currentStatus: '상태: 대기 중' });
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
    updatePopupStatus('상태: AI 분석 중... (0%)');
    const session = await initializeAI();

    if (session) {
        lastAnalysisType = type;
        const elements = Array.from(document.querySelectorAll('body *'));
        const totalElements = elements.length;
        let processedCount = 0;

        // ✨ for 루프로 변경하여 진행도 추적
        for (const el of elements) {
            // Promise.all 대신 개별적으로 await 처리하여 순서 보장 및 진행도 계산
            await analyzeElement(session, el, type);
            processedCount++;
            
            // 진행도 계산 및 팝업으로 메시지 전송
            const progress = (processedCount / totalElements) * 100;
            chrome.runtime.sendMessage({ action: "update_progress", value: progress });
        }
        
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

    isSimulatingCorrected = !isSimulatingCorrected;
    if (isSimulatingCorrected) {
        const filterId = `${type}-sim-filter`;
        document.documentElement.style.filter = `url(#${filterId})`;
        updatePopupStatus('상태: 보정 후 체험 (ON)');
    } else {
        document.documentElement.style.filter = '';
        updatePopupStatus('상태: 보정 후 체험 (OFF)');
    }
}

// ===== 3. AI 관련 헬퍼 함수 (✨ 여기가 복원된 부분입니다) =====
async function initializeAI() {
    if (!('LanguageModel' in window)) {
        console.error("LanguageModel API not available.");
        return null;
    }
    try {
        return await LanguageModel.create();
    } catch (e) {
        console.error("Failed to initialize AI session:", e);
        return null;
    }
}

async function analyzeElement(session, element, colorblindType) {
    // 분석할 필요가 없는 요소는 빠르게 건너뛰기
    if (element.children.length > 0 || !element.textContent.trim()) return;
    
    const style = window.getComputedStyle(element);
    const color = style.color;
    const backgroundColor = style.backgroundColor;

    // 투명하거나 동일한 색상은 분석에서 제외
    if (style.opacity === '0' || color === backgroundColor) return;

    const prompt = `Analyze if the element with TextColor=${color} and BackgroundColor=${backgroundColor} is hard to distinguish for a user with ${colorblindType}. Respond ONLY with a raw JSON object: {"is_problematic": true} or {"is_problematic": false}.`;

    try {
        const resultRaw = await session.prompt(prompt);
        const cleanedText = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const resultJSON = JSON.parse(cleanedText);

        if (resultJSON.is_problematic) {
            const filterId = `${colorblindType}-correct-filter`;
            element.style.filter = `url(#${filterId})`;
            element.setAttribute('data-rgbranger-corrected', 'true');
        }
    } catch (e) { 
        console.error("AI response error:", e, "Raw response:", resultRaw); 
    }
}

if (!window.rgbrangerListener) {
    window.rgbrangerListener = true;
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        injectSvgFilters();
        switch (request.action) {
            case 'simulate': simulateView(request.type); break;
            case 'analyze': analyzeAndCorrect(request.type); break;
            case 'toggleVerify': toggleVerify(request.type); break;
            case 'reset': resetAll(); break;
        }
        sendResponse({ status: "Action received" });
        return true;
    });
}