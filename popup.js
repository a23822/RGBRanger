document.getElementById('RGBRANGER-BUTTON-START').addEventListener('click', async () => {
  const selectElement = document.getElementById('colorblind-type-select');
  const selectedType = selectElement.value;

  // 1. 사용자가 선택한 색맹 유형을 chrome.storage에 저장
  await chrome.storage.local.set({ colorblindType: selectedType });

  // 2. 현재 탭에 content.js 스크립트 주입
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});