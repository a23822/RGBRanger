async function initializeAI() {
  if (!('ai' in window)) {
    console.error("On-device AI (Gemini Nano) is not available.");
    return null;
  }
  try {
    const session = await window.ai.createTextSession();
    return session;
  } catch (error) {
    console.error("Failed to initialize AI session:", error);
    return null;
  }
}

async function analyzeAndAdjust(session, element) {
    const style = window.getComputedStyle(element);
    const color = style.color;
    const backgroundColor = style.backgroundColor;

    // 고도화된 프롬프트 설계
    const prompt = `
    Role: Web Accessibility Expert specialized in color vision deficiency.
    Task: Analyze the following web element for a user with Deuteranopia (red-green colorblindness).
    Element Info: Tag=${element.tagName}, TextColor=${color}, BackgroundColor=${backgroundColor}.
    Objective: If the colors are indistinguishable or contrast is low, suggest alternative CSS properties to improve visibility while maintaining the original design intent.
    Response Format: Return a JSON object with suggested CSS changes (e.g., {"color": "#newColor", "border": "1px solid #otherColor"}). If no change is needed, return an empty JSON object {}.
    `;

    const resultRaw = await session.prompt(prompt);

    try {
        const resultJSON = JSON.parse(resultRaw);
        // AI의 제안을 적용
        Object.assign(element.style, resultJSON);
    } catch (e) {
        console.error("Failed to parse AI response:", resultRaw);
    }
}

(async () => {
  const session = await initializeAI();
  if (session) {
    // 페이지의 모든 요소를 대상으로 분석 및 수정을 시도합니다.
    // 실제로는 특정 요소(예: 버튼, 링크)만 선택하는 것이 성능에 좋습니다.
    document.querySelectorAll('*').forEach(element => {
      analyzeAndAdjust(session, element);
    });
  }
})();