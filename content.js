// SVG 필터를 페이지에 주입하는 함수
function injectSvgFilters() {
    if (document.getElementById('rgbranger-svg-filters')) return;
    const svgFilters = `
        <svg id="rgbranger-svg-filters" style="position: absolute; height: 0; width: 0;">
            <defs>
                <filter id="deuteranopia-filter">
                    <feColorMatrix type="matrix" values="0.625 0.375 0 0 0, 0.7 0.3 0 0 0, 0 0.3 0.7 0 0, 0 0 0 1 0" />
                </filter>
                <filter id="protanopia-filter">
                     <feColorMatrix type="matrix" values="0.567 0.433 0 0 0, 0.558 0.442 0 0 0, 0 0.242 0.758 0 0, 0 0 0 1 0" />
                </filter>
            </defs>
        </svg>
    `;
    document.body.insertAdjacentHTML('afterbegin', svgFilters);
}

// AI 세션 초기화 함수
async function initializeAI() {
  if (!('LanguageModel' in window)) return null;
  try {
    return await LanguageModel.create();
  } catch (error) {
    console.error("Failed to initialize AI session:", error);
    return null;
  }
}

// AI 분석 및 필터 적용 함수
async function analyzeAndApplyFilter(session, element, colorblindType) {
    const style = window.getComputedStyle(element);
    const color = style.color;
    const backgroundColor = style.backgroundColor;
    if (color === backgroundColor || !element.textContent.trim()) return;

    // --- 프롬프트가 저장된 값을 동적으로 사용 ---
    const prompt = `
    You are a web accessibility expert.
    Analyze the element for a user with ${colorblindType}.
    Element: TextColor=${color}, BackgroundColor=${backgroundColor}.
    Is this color combination hard to distinguish?
    IMPORTANT: Respond ONLY with a raw JSON object. Example: {"is_problematic": true} or {"is_problematic": false}.
    `;

    try {
        const resultRaw = await session.prompt(prompt);
        const cleanedText = resultRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const resultJSON = JSON.parse(cleanedText);

        if (resultJSON.is_problematic) {
            // --- 필터 ID를 저장된 값에 따라 동적으로 선택 ---
            const filterId = `${colorblindType}-filter`;
            element.style.filter = `url(#${filterId})`;
        }
    } catch (e) {
        console.error("Failed to process AI response:", e, "Raw response:", resultRaw);
    }
}

// ===== 핵심 실행 코드 (저장소 값 읽기 추가) =====
(async () => {
  // 1. chrome.storage에서 사용자가 선택한 값 가져오기
  const data = await chrome.storage.local.get('colorblindType');
  const selectedType = data.colorblindType || 'deuteranopia'; // 기본값 설정

  console.log(`RGB Ranger: Starting analysis for ${selectedType}...`);

  // 2. 페이지에 SVG 필터 삽입
  injectSvgFilters();

  // 3. AI 세션 초기화
  const session = await initializeAI();

  if (session) {
    console.log("RGB Ranger: AI session initialized. Analyzing elements.");
    // 4. 각 요소를 "선택된 유형"으로 분석 및 필터 적용
    document.querySelectorAll('body *').forEach(element => {
      analyzeAndApplyFilter(session, element, selectedType);
    });
    console.log("RGB Ranger: Analysis complete.");
  }
})();