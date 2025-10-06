// content.js에 액션을 전달하는 공통 함수
async function runAction(action) {
    const statusDisplay = document.getElementById('status-display');
    statusDisplay.textContent = '상태: 실행 중...'; // 버튼 클릭 시 즉시 상태 변경

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
    if (request.action === "update_status") {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.textContent = request.message;
        }
    }
});

// 각 버튼 이벤트 리스너 (기존과 동일)
document.getElementById('simulate-button').addEventListener('click', () => runAction('simulate'));
document.getElementById('analyze-button').addEventListener('click', () => runAction('analyze'));
document.getElementById('verify-toggle-button').addEventListener('click', () => runAction('toggleVerify'));
document.getElementById('reset-button').addEventListener('click', () => runAction('reset'));