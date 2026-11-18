/* Korean/Japanese UI localization for the Northeast Asia Typhoon Archive.
   Data values, source URLs, storm tracks and third-party iframe content remain unchanged. */
(() => {
  "use strict";

  const STORAGE_KEY = "typhoon-ui-language";
  const TRANSLATIONS = [
    ["기상청 공식 태풍정보와 과거 통계를 함께 보는 동북아 태풍 대시보드", "気象庁の公式台風情報と過去の統計を確認できる北東アジア台風ダッシュボード"],
    ["JMA 공식 태풍정보와 기상청 태풍 통계를 연결했습니다.", "気象庁（JMA）の公式台風情報と韓国気象庁（KMA）の台風統計を連携しています。"],
    ["일본 기상청(JMA) 공식 태풍 데이터로 현재 위치와 예상 경로를 표시합니다. 새로고침 버튼으로 즉시 갱신하며 10분마다 새 태풍을 자동 확인합니다.", "気象庁（JMA）の公式データから台風の現在位置と予想進路を表示します。更新ボタンですぐに更新でき、10分ごとに新しい台風を自動確認します。"],
    ["일본 기상청(JMA) 공식 태풍 데이터로 현재 위치·예보원·경로를 표시합니다.", "気象庁（JMA）の公式データから現在位置・予報円・進路を表示します。"],
    ["한국 기상청이 제공하는 공식 태풍 상세정보 화면입니다.", "韓国気象庁（KMA）が提供する公式台風詳細情報です（外部ページは韓国語表示）。"],
    ["7~10월은 북서태평양 태풍 활동이 이어지는 주요 시즌이며, 7~9월은 특히 발생과 한국 영향이 집중되는 시기입니다. 항만 하역, 선박 운항, 원료 조달과 제품 출하 일정에 지연 가능성을 반영해 사전 여유를 확보하세요.", "7～10月は北西太平洋で台風活動が続く主なシーズンで、特に7～9月は発生数と韓国への影響が集中します。港湾荷役、船舶運航、原料調達、製品出荷の遅延リスクを考慮し、事前に余裕を確保してください。"],
    ["현재 위치와 예상 진로는 일본 기상청(JMA) 공식 태풍정보를 사용하고, 월별·연도별 발생 및 한국 영향 통계는 기상청 날씨누리를 기준으로 합니다.", "現在位置と予想進路は気象庁（JMA）の公式台風情報を使用し、月別・年別の発生数および韓国への影響は韓国気象庁（KMA）の統計に基づきます。"],
    ["※ %는 구성비입니다. 한국 영향 자료가 비어 있는 연도는 한국 영향 비중 계산에서 제외합니다.", "※ %は構成比です。韓国への影響データがない年は、影響割合の算出から除外します。"],
    ["※ %는 구성비입니다. 한국 영향 결측 연도는 비중 계산에서 제외합니다.", "※ %は構成比です。韓国への影響データがない年は割合の算出から除外します。"],
    ["속보 PDF 경로를 지도에 변환하지 못했습니다. 아래 JMA 공식 경로도·위치표 PDF에서 확인할 수 있습니다.", "速報PDFの進路を地図に変換できませんでした。以下のJMA公式進路図・位置表PDFをご確認ください。"],
    ["선택한 태풍의 확정 경로 데이터가 없습니다. 아래 JMA 공식 경로도·위치표 PDF에서 확인할 수 있습니다.", "選択した台風の確定進路データはありません。以下のJMA公式進路図・位置表PDFをご確認ください。"],
    ["브라우저에서 과거 CSV를 직접 읽을 수 없어 JMA 공식 경로도로 연결합니다.", "ブラウザーで過去のCSVを直接取得できないため、JMAの公式進路図へ移動します。"],
    ["JMA 데이터 연결에 실패했습니다. 잠시 후 새로고침해 주세요.", "JMAデータの接続に失敗しました。しばらくしてから更新してください。"],
    ["JMA 현재 태풍 목록을 불러오지 못했습니다.", "JMAの現在の台風一覧を取得できませんでした。"],
    ["현재 JMA에서 발표 중인 태풍 정보가 없습니다.", "現在、JMAが発表中の台風情報はありません。"],
    ["선택한 태풍의 위치 데이터를 읽지 못했습니다.", "選択した台風の位置データを読み取れませんでした。"],
    ["JMA 속보 위치표 PDF에서 경로를 불러오는 중입니다.", "JMAの速報位置表PDFから進路を読み込んでいます。"],
    ["현재 선택한 기간과 통계를 16:9 보고서 템플릿으로 다시 렌더링합니다.", "現在選択した期間の統計を16:9のレポート形式で再作成します。"],
    ["통계 데이터를 아직 불러오지 못했습니다.", "統計データをまだ取得できていません。"],
    ["통계 데이터를 불러오지 못했습니다.", "統計データを取得できませんでした。"],
    ["JMA 발표 ", "JMA発表 "],
    ["현재 위치와 5일 예상 진로", "現在位置と5日間の予想進路"],
    ["한국 기상청 현재 태풍정보", "韓国気象庁の現在の台風情報"],
    ["태풍 위치·예상 경로·강도·중심기압", "台風の位置・予想進路・強さ・中心気圧"],
    ["JMA 과거 위치표 · 경로 재생", "JMA過去の位置表・進路表示"],
    ["JMA 속보 위치표 PDF · 경로 재생", "JMA速報位置表PDF・進路表示"],
    ["JMA 속보 분석 · 공식 자료 연결", "JMA速報解析・公式資料へのリンク"],
    ["JMA 현재·예보 / 과거 경로", "JMA現在・予報 / 過去の進路"],
    ["JMA 태풍 현재 위치 및 예상 경로 지도", "JMA台風の現在位置・予想進路地図"],
    ["JMA 현재 태풍지도 열기 ↗", "JMA現在の台風マップを開く ↗"],
    ["기상청 태풍발생현황 통계 ↗", "韓国気象庁 台風発生統計 ↗"],
    ["기상청 월별 태풍 발생 및 한국 영향 평년값 그래프", "韓国気象庁の月別台風発生数・韓国への影響の平年値グラフ"],
    ["JMA 연도별 경로도 ↗", "JMA年別進路図 ↗"],
    ["JMA 경로도 ↗", "JMA進路図 ↗"],
    ["위치표 PDF ↗", "位置表PDF ↗"],
    ["기상청 원문 ↗", "韓国気象庁 原文 ↗"],
    ["JMA 태풍지도 ↗", "JMA台風マップ ↗"],
    ["Windy 열기 ↗", "Windyを開く ↗"],
    ["회의자료용 그래프 저장", "会議資料用グラフを保存"],
    ["회의자료 저장", "会議資料を保存"],
    ["저장 형식을 선택하세요.", "保存形式を選択してください。"],
    ["회의자료 추천 · 3200×1800 고해상도", "会議資料におすすめ・3200×1800 高解像度"],
    ["전체 배경 없이 슬라이드 위에 자유롭게 배치", "背景なしでスライド上に自由に配置"],
    ["확대해도 선명 · 인쇄와 편집에 적합", "拡大しても鮮明・印刷や編集に最適"],
    ["출처·기간·범례 자동 포함", "出典・期間・凡例を自動挿入"],
    ["고해상도 그래프 생성 중…", "高解像度グラフを生成中…"],
    ["저장이 시작되었습니다.", "保存を開始しました。"],
    ["저장 중 오류가 발생했습니다.", "保存中にエラーが発生しました。"],
    ["SVG 렌더링 실패", "SVGのレンダリングに失敗しました"],
    ["Canvas를 만들 수 없습니다.", "Canvasを作成できません。"],
    ["PNG 생성 실패", "PNGの生成に失敗しました"],
    ["화이트 PNG", "白背景 PNG"],
    ["투명 PNG", "透過 PNG"],
    ["벡터 SVG", "ベクター SVG"],
    ["동북아 태풍 아카이브", "北東アジア台風アーカイブ"],
    ["일본 기상청 JMA 태풍도", "気象庁 JMA 台風マップ"],
    ["현재 위치 · 예상 진로 · 예보원 · 날짜/시간", "現在位置・予想進路・予報円・日時"],
    ["태풍 시즌 · 석유화학 공급망 주의", "台風シーズン・石油化学サプライチェーンへの注意"],
    ["월별 태풍 발생 통계", "月別台風発生統計"],
    ["연간 태풍 시즌 주의 구간", "年間台風シーズンの注意期間"],
    ["선택기간 태풍 통계", "選択期間の台風統計"],
    ["2023–2025년 기상청 아카이브", "2023～2025年 韓国気象庁アーカイブ"],
    ["1991–2020년 기간 평균을 불러오는 중입니다.", "1991～2020年の期間平均を読み込んでいます。"],
    ["기상청 날씨누리 · 태풍발생현황 통계", "韓国気象庁・台風発生統計"],
    ["출처: 기상청 날씨누리 · 태풍발생현황 통계", "出典：韓国気象庁・台風発生統計"],
    ["파란색 전체 발생, 노란색 한국 영향", "青：発生総数、黄：韓国への影響"],
    ["북서태평양", "北西太平洋"],
    ["우리나라", "韓国"],
    ["연평균 한국 영향", "年平均の韓国への影響"],
    ["연간 한국 영향", "年間の韓国への影響"],
    ["연평균 발생", "年平均発生数"],
    ["연간 발생", "年間発生数"],
    ["최다월 평균", "最多月の平均"],
    ["최다월", "最多月"],
    ["발생 최다월", "発生数が最多の月"],
    ["발생 태풍", "発生台風数"],
    ["월별 태풍 통계", "月別台風統計"],
    ["연도별", "年別"],
    ["선택한 기간", "選択した期間"],
    ["기간 평균", "期間平均"],
    ["단일 연도", "単年"],
    ["기간 변경", "期間を変更"],
    ["전체 발생", "発生総数"],
    ["한국 영향", "韓国への影響"],
    ["전체 · 영향", "発生・影響"],
    ["한국 영향 / 전체", "韓国への影響 / 全体"],
    ["7–10월 / 전체", "7～10月 / 全体"],
    ["7–10월 태풍 시즌", "7～10月 台風シーズン"],
    ["태풍 집중 관리", "台風警戒強化"],
    ["태풍 사전·후속 주의", "台風への事前・事後警戒"],
    ["평시 모니터링", "通常監視"],
    ["주의 강화 · 집중 관리", "警戒強化・重点管理"],
    ["사전·후속 점검", "事前・事後点検"],
    ["평시 모니터링", "通常監視"],
    ["재고 여유분 확인", "安全在庫の確認"],
    ["선박·항만 일정 점검", "船舶・港湾スケジュールの確認"],
    ["대체 운송 검토", "代替輸送の検討"],
    ["고객 납기 사전 조율", "顧客との納期事前調整"],
    ["월 현재 운영 단계", "月現在の運用段階"],
    ["현재 월 기준", "今月の状況"],
    ["확인 중", "確認中"],
    ["기상청 통계", "韓国気象庁統計"],
    ["가용자료", "利用可能データ"],
    ["개 연도 평균", "年間の平均"],
    ["3개 연도 평균", "3年間の平均"],
    ["JMA 예보 불러오는 중", "JMA予報を読み込み中"],
    ["JMA 데이터 연결 중", "JMAデータに接続中"],
    ["JMA 데이터를 불러오지 못함", "JMAデータを取得できません"],
    ["JMA 최신 · ", "JMA最新・"],
    ["현재 태풍 확인 중", "現在の台風を確認中"],
    ["현재 발표 중 태풍 없음", "現在発表中の台風なし"],
    ["현재 태풍 목록 연결 실패", "現在の台風一覧の取得に失敗"],
    ["위성지도 연결 불안정 · 일반지도로 전환", "衛星地図の接続が不安定なため通常地図に切り替えました"],
    ["공식 경로도에서 선택", "公式進路図から選択"],
    ["자료 불러오는 중", "データを読み込み中"],
    ["PDF 분석 중", "PDFを解析中"],
    ["불러오는 중…", "読み込み中…"],
    ["업데이트 중…", "更新中…"],
    ["지도 새로고침", "地図を更新"],
    ["화면 동기화 시각 확인 중", "同期時刻を確認中"],
    ["화면 동기화", "画面同期"],
    ["태풍 지도 선택", "台風地図の選択"],
    ["태풍 조회 방식", "台風表示モード"],
    ["지도 배경 선택", "地図の背景を選択"],
    ["현재 태풍 선택", "現在の台風を選択"],
    ["과거 태풍 연도", "過去の台風の年"],
    ["과거 태풍 선택", "過去の台風を選択"],
    ["한국 기상청 태풍 상세정보", "韓国気象庁の台風詳細情報"],
    ["태풍 시즌 운영 점검 항목", "台風シーズンの運用チェック項目"],
    ["데이터 연결 상태", "データ接続状況"],
    ["통계 기간 선택", "統計期間の選択"],
    ["그래프 범례", "グラフ凡例"],
    ["시작 연도", "開始年"],
    ["종료 연도", "終了年"],
    ["조회 연도", "対象年"],
    ["태풍 상세", "台風の詳細"],
    ["태풍 정보", "台風情報"],
    ["JMA 태풍도", "JMA台風図"],
    ["한국 기상청", "韓国気象庁"],
    ["현재·예보", "現在・予報"],
    ["과거 태풍", "過去の台風"],
    ["태풍 위치", "台風位置"],
    ["현재 위치", "現在位置"],
    ["예상 경로", "予想進路"],
    ["예상 진로", "予想進路"],
    ["과거 경로", "過去の進路"],
    ["속보 경로", "速報進路"],
    ["속보", "速報"],
    ["예보원", "予報円"],
    ["일반지도", "通常地図"],
    ["위성", "衛星"],
    ["태풍", "台風"],
    ["열대저기압", "熱帯低気圧"],
    ["중심기압", "中心気圧"],
    ["최대풍속", "最大風速"],
    ["이동방향", "移動方向"],
    ["이동속도", "移動速度"],
    ["기간", "期間"],
    ["전체화면", "全画面"],
    ["닫기", "閉じる"],
    ["보기", "表示"],
    ["자료 없음", "データなし"],
    ["연간", "年間"],
    ["평균", "平均"],
    ["발생", "発生"],
    ["공식 자료", "公式資料"],
    ["추천", "おすすめ"],
    ["오전", "午前"],
    ["오후", "午後"],
    ["현재", "現在"],
    ["일본 기상청", "気象庁（JMA）"],
    ["기상청", "気象庁"],
    ["우리", "韓国"],
    ["한국", "韓国"]
  ];

  // Replace longer phrases first to prevent partial translations from corrupting a sentence.
  const ordered = TRANSLATIONS.slice().sort((a, b) => b[0].length - a[0].length);
  const textCache = new WeakMap();
  const attrCache = new WeakMap();
  let language;
  try { language = localStorage.getItem(STORAGE_KEY) === "ja" ? "ja" : "ko"; }
  catch (_) { language = "ko"; }

  function toJapanese(value) {
    if (value == null) return "";
    let translated = String(value);
    if (!/[가-힣]/.test(translated)) return translated;
    for (const pair of ordered) {
      if (translated.includes(pair[0])) translated = translated.split(pair[0]).join(pair[1]);
    }
    return translated
      .replace(/(\d{4})년/g, "$1年")
      .replace(/(\d{1,2})월/g, "$1月")
      .replace(/(\d{1,2})호/g, "第$1号")
      .replace(/(\d{1,2})시/g, "$1時")
      .replace(/(\d+(?:\.\d+)?)개/g, "$1個")
      .replace(/개\s*연도/g, "年間");
  }

  function translate(value) {
    return language === "ja" ? toJapanese(value) : String(value ?? "");
  }

  function translateNode(node) {
    const value = node.nodeValue;
    let tracked = textCache.get(node);
    if (!tracked || value !== tracked.shown) tracked = { original: value, shown: value };
    const next = translate(tracked.original);
    textCache.set(node, { original: tracked.original, shown: next });
    if (value !== next) node.nodeValue = next;
  }

  const ATTRIBUTES = ["aria-label", "title", "placeholder", "alt", "content"];
  function translateAttributes(element) {
    let records = attrCache.get(element);
    if (!records) records = new Map();
    for (const attribute of ATTRIBUTES) {
      if (!element.hasAttribute(attribute)) continue;
      if (attribute === "content" && !element.matches('meta[name="description"]')) continue;
      const current = element.getAttribute(attribute);
      let record = records.get(attribute);
      if (!record || current !== record.shown) record = { original: current, shown: current };
      const next = translate(record.original);
      records.set(attribute, { original: record.original, shown: next });
      if (current !== next) element.setAttribute(attribute, next);
    }
    attrCache.set(element, records);
  }

  function translateSubtree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement || root.parentElement.closest("script,style,noscript,[data-no-translate]")) return;
      translateNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE && root.matches("script,style,noscript,[data-no-translate]")) return;
    const element = root.nodeType === Node.ELEMENT_NODE ? root : root.documentElement;
    if (!element) return;
    translateAttributes(element);
    element.querySelectorAll("*").forEach(el => {
      if (!el.closest("[data-no-translate]") && !el.matches("script,style,noscript")) translateAttributes(el);
    });
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return node.parentElement?.closest("script,style,noscript,[data-no-translate]")
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateNode(node);
  }

  function updateButtons() {
    const ko = document.getElementById("languageKo");
    const ja = document.getElementById("languageJa");
    if (ko) ko.setAttribute("aria-pressed", String(language === "ko"));
    if (ja) ja.setAttribute("aria-pressed", String(language === "ja"));
    document.documentElement.lang = language;
  }

  function setLanguage(next) {
    if (next !== "ko" && next !== "ja") return;
    language = next;
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) {}
    updateButtons();
    translateSubtree(document.documentElement);
    document.dispatchEvent(new CustomEvent("typhoon-language-change", { detail: { language } }));
  }

  const observer = new MutationObserver(mutations => {
    const nodes = new Set();
    for (const m of mutations) {
      if (m.type === "characterData") nodes.add(m.target);
      if (m.type === "attributes") nodes.add(m.target);
      if (m.type === "childList") {
        for (const node of m.addedNodes) nodes.add(node);
      }
    }
    for (const node of nodes) translateSubtree(node);
  });

  const koButton = document.getElementById("languageKo");
  const jaButton = document.getElementById("languageJa");
  koButton?.addEventListener("click", () => setLanguage("ko"));
  jaButton?.addEventListener("click", () => setLanguage("ja"));

  window.typhoonI18n = {
    get language() { return language; },
    setLanguage,
    translate,
    toJapanese
  };
  updateButtons();
  translateSubtree(document.documentElement);
  observer.observe(document.documentElement, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
    subtree: true
  });
  document.dispatchEvent(new CustomEvent("typhoon-language-change", { detail: { language } }));
})();
