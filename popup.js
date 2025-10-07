//--- ✨ 팝업이 열릴 때 저장된 마지막 상태를 불러오는 코드 ---
document.addEventListener('DOMContentLoaded', () => {
    const statusDisplay = document.getElementById('status-display');
    // chrome.storage에서 'currentStatus' 값을 가져옵니다.
    chrome.storage.local.get('currentStatus', (data) => {
        if (data.currentStatus) {
            statusDisplay.textContent = data.currentStatus;
        } else {
            // 저장된 상태가 없으면 기본값 표시
            statusDisplay.textContent = '상태: 대기 중';
        }
    });
});

// content.js에 액션을 전달하는 공통 함수
async function runAction(action) {
    const statusDisplay = document.getElementById('status-display');
    const progressBar = document.getElementById('analysis-progress');
    
    // AI 분석 시작 시 프로그레스 바를 보여주고 초기화
    if (action === 'analyze') {
        statusDisplay.textContent = '상태: AI 분석 중... (0%)';
        progressBar.style.display = 'block';
        progressBar.value = 0;
    } else {
        progressBar.style.display = 'none'; // 다른 액션은 프로그레스 바 숨김
    }

    const selectedType = document.getElementById('colorblind-type-select').value;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action, type: selectedType }, (response) => {
        if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tab.id, { action, type: selectedType });
            });
        }
    });
}

// --- ✨ content.js로부터 상태 메시지를 받는 리스너 추가 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const statusDisplay = document.getElementById('status-display');
    const progressBar = document.getElementById('analysis-progress');

    // 상태 업데이트 메시지 처리
    if (request.action === "update_status") {
        if (statusDisplay) statusDisplay.textContent = request.message;
        // 분석 중이 아닐 때는 프로그레스 바를 숨김
        if (!request.message.includes('분석 중')) {
            progressBar.style.display = 'none';
        }
    }

    // ✨ 프로그레스 바 업데이트 메시지 처리
    if (request.action === "update_progress") {
        if (progressBar) {
            progressBar.value = request.value;
            statusDisplay.textContent = `상태: AI 분석 중... (${Math.round(request.value)}%)`;
        }
    }
});

// 각 버튼 이벤트 리스너 (기존과 동일)
document.getElementById('simulate-button').addEventListener('click', () => runAction('simulate'));
document.getElementById('analyze-button').addEventListener('click', () => runAction('analyze'));
document.getElementById('verify-toggle-button').addEventListener('click', () => runAction('toggleVerify'));
document.getElementById('reset-button').addEventListener('click', () => runAction('reset'));