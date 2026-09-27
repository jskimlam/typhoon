(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const EXPORT_W = 1600;
  const EXPORT_H = 900;
  const PNG_SCALE = 2;

  const chartTools = document.querySelector(".chart-tools");
  if (!chartTools) return;

  const escapeXml = value => String(value ?? "").replace(/[<>&'"]/g, ch => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '"':"&quot;"
  }[ch]));

  const fmt = value => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "—";
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  };

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "chart-export-trigger";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4"></path>
      <path d="M5 15v4h14v-4"></path>
    </svg>
    회의자료 저장
  `;
  chartTools.appendChild(trigger);

  const backdrop = document.createElement("div");
  backdrop.className = "chart-export-backdrop";
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <section class="chart-export-dialog" role="dialog" aria-modal="true" aria-labelledby="chartExportTitle">
      <div class="chart-export-head">
        <div>
          <h3 id="chartExportTitle">회의자료용 그래프 저장</h3>
          <p>현재 선택한 기간과 통계를 16:9 보고서 템플릿으로 다시 렌더링합니다.</p>
        </div>
        <button class="chart-export-close" type="button" aria-label="닫기">×</button>
      </div>
      <div class="chart-export-options">
        <button class="chart-export-option recommended" type="button" data-export="white">
          <span class="chart-export-icon">PNG</span>
          <span><strong>화이트 PNG</strong><small>회의자료 추천 · 3200×1800 고해상도</small></span>
          <span class="chart-export-badge">추천</span>
        </button>
        <button class="chart-export-option" type="button" data-export="transparent">
          <span class="chart-export-icon">PNG</span>
          <span><strong>투명 PNG</strong><small>전체 배경 없이 슬라이드 위에 자유롭게 배치</small></span>
          <span></span>
        </button>
        <button class="chart-export-option" type="button" data-export="svg">
          <span class="chart-export-icon">SVG</span>
          <span><strong>벡터 SVG</strong><small>확대해도 선명 · 인쇄와 편집에 적합</small></span>
          <span></span>
        </button>
      </div>
      <div class="chart-export-foot">
        <span>출처·기간·범례 자동 포함</span>
        <span class="chart-export-status">저장 형식을 선택하세요.</span>
      </div>
    </section>
  `;
  document.body.appendChild(backdrop);

  const closeButton = backdrop.querySelector(".chart-export-close");
  const status = backdrop.querySelector(".chart-export-status");

  const openDialog = () => {
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";
    status.className = "chart-export-status";
    status.textContent = "저장 형식을 선택하세요.";
    closeButton.focus();
  };
  const closeDialog = () => {
    backdrop.hidden = true;
    if (!document.body.classList.contains("map-expanded")) document.body.style.overflow = "";
    trigger.focus();
  };

  trigger.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);
  backdrop.addEventListener("click", e => { if (e.target === backdrop) closeDialog(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !backdrop.hidden) closeDialog();
  });

  function getState() {
    const state = window.__typhoonExportState;
    if (!state || !Array.isArray(state.items) || state.items.length !== 12) {
      throw new Error("통계 데이터를 아직 불러오지 못했습니다.");
    }
    return state;
  }

  function safeFilename(label, ext, suffix="") {
    const base = String(label || "typhoon_statistics")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 70);
    return `월별태풍통계_${base}${suffix}.${ext}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function buildSvg(state, transparent=false) {
    const items = state.items;
    const max = Math.max(1, ...items.map(d => Number(d.total) || 0));
    const chartX = 72, chartY = 324, chartW = 1456, chartH = 344;
    const plotTop = chartY + 28, plotBottom = chartY + 286;
    const plotH = plotBottom - plotTop;
    const groupW = chartW / 12;
    const totalBarW = 42, impactBarW = 26, gap = 7;
    const bg = transparent ? "none" : "#ffffff";
    const cardFill = transparent ? "rgba(255,255,255,0.92)" : "#F8FAFC";
    const chartFill = transparent ? "rgba(255,255,255,0.82)" : "#ffffff";
    const totalLabel = escapeXml(state.totalLabel || (state.isAverage ? "연평균 발생" : "연간 발생"));
    const impactLabel = escapeXml(state.impactLabel || (state.isAverage ? "연평균 한국 영향" : "연간 한국 영향"));
    const subtitle = escapeXml(state.label || "");
    const rate = Number(state.total) ? (Number(state.impact) / Number(state.total) * 100).toFixed(1) + "%" : "0%";
    const peak = items.reduce((best, d) => Number(d.total) > Number(best.total) ? d : best, items[0]);

    const gridLines = [0, .25, .5, .75, 1].map(p => {
      const y = plotBottom - plotH * p;
      return `<line x1="${chartX+24}" y1="${y}" x2="${chartX+chartW-24}" y2="${y}" stroke="#DCE5ED" stroke-width="1"/>`;
    }).join("");

    const groups = items.map((d, i) => {
      const gx = chartX + groupW * i + groupW / 2;
      const totalH = Math.max(2, (Number(d.total)||0) / max * plotH);
      const impactH = Math.max(2, (Number(d.impact)||0) / max * plotH);
      const totalX = gx - totalBarW - gap/2;
      const impactX = gx + gap/2;
      const totalY = plotBottom - totalH;
      const impactY = plotBottom - impactH;
      const peakBand = d.month >= 7 && d.month <= 9
        ? `<rect x="${chartX + groupW*i + 5}" y="${chartY+8}" width="${groupW-10}" height="${chartH-18}" rx="14" fill="#FF6E7F" fill-opacity=".055"/>`
        : "";
      return `
        ${peakBand}
        <rect x="${totalX}" y="${totalY}" width="${totalBarW}" height="${totalH}" rx="10" fill="url(#blueBar)"/>
        <rect x="${impactX}" y="${impactY}" width="${impactBarW}" height="${impactH}" rx="8" fill="url(#yellowBar)"/>
        <text x="${totalX+totalBarW/2}" y="${Math.max(chartY+20,totalY-10)}" text-anchor="middle" class="value blue">${escapeXml(fmt(d.total))}</text>
        <text x="${impactX+impactBarW/2}" y="${Math.max(chartY+20,impactY-10)}" text-anchor="middle" class="value yellow">${escapeXml(fmt(d.impact))}</text>
        <text x="${gx}" y="${plotBottom+34}" text-anchor="middle" class="month">${d.month}월</text>
        <text x="${gx}" y="${plotBottom+54}" text-anchor="middle" class="monthSub">전체 · 영향</text>
      `;
    }).join("");

    const kpis = [
      {label: totalLabel, value: fmt(state.total) + "개", color:"#2F7FEA"},
      {label: impactLabel, value: fmt(state.impact) + "개", color:"#F2B638"},
      {label:"발생 최다월", value:`${peak.month}월 · ${fmt(peak.total)}개`, color:"#40BFEF"},
      {label:"한국 영향 비율", value:rate, color:"#FF5874"}
    ].map((k, i) => {
      const x = 72 + i * 364;
      return `
        <rect x="${x}" y="146" width="346" height="104" rx="18" fill="${cardFill}" stroke="#D8E3EC"/>
        <rect x="${x}" y="146" width="5" height="104" rx="3" fill="${k.color}"/>
        <text x="${x+20}" y="179" class="kpiLabel">${escapeXml(k.label)}</text>
        <text x="${x+20}" y="222" class="kpiValue">${escapeXml(k.value)}</text>
      `;
    }).join("");

    const seasonCells = Array.from({length:12}, (_, i) => {
      const m = i + 1;
      const x = 72 + i * (1456 / 12);
      const w = 1456/12 - 6;
      const peakMonth = m >= 7 && m <= 9;
      const watch = m === 6 || m === 10;
      const fill = peakMonth ? "#FFF1F4" : watch ? "#FFF8E8" : (transparent ? "rgba(255,255,255,.88)" : "#F7FAFC");
      const stroke = peakMonth ? "#E99AA8" : watch ? "#DDC37A" : "#D8E3EC";
      const text = peakMonth ? "#B73B50" : watch ? "#8C6C12" : "#526A7D";
      const current = Number(state.currentMonth) === m;
      return `
        <rect x="${x}" y="755" width="${w}" height="38" rx="8" fill="${fill}" stroke="${current ? "#10263A" : stroke}" stroke-width="${current ? 2.5 : 1}"/>
        <text x="${x+w/2}" y="780" text-anchor="middle" font-size="14" font-weight="800" fill="${text}">${m}월</text>
        ${current ? `<text x="${x+w/2}" y="813" text-anchor="middle" font-size="11" font-weight="900" fill="#10263A">현재</text>` : ""}
      `;
    }).join("");

    return `<svg xmlns="${SVG_NS}" width="${EXPORT_W}" height="${EXPORT_H}" viewBox="0 0 ${EXPORT_W} ${EXPORT_H}">
      <defs>
        <linearGradient id="blueBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#69A8FF"/><stop offset="52%" stop-color="#3987F5"/><stop offset="100%" stop-color="#2268D6"/>
        </linearGradient>
        <linearGradient id="yellowBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#FFE08A"/><stop offset="52%" stop-color="#F3BE43"/><stop offset="100%" stop-color="#D99B1B"/>
        </linearGradient>
        <style>
          text{font-family:Pretendard,"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif}
          .title{font-size:38px;font-weight:900;fill:#10263A;letter-spacing:-1px}
          .subtitle{font-size:18px;font-weight:600;fill:#6A8092}
          .eyebrow{font-size:13px;font-weight:900;fill:#7890A4;letter-spacing:2px}
          .kpiLabel{font-size:14px;font-weight:700;fill:#677E91}
          .kpiValue{font-size:28px;font-weight:900;fill:#10263A}
          .value{font-size:14px;font-weight:900}.value.blue{fill:#17324A}.value.yellow{fill:#9A6500}
          .month{font-size:15px;font-weight:900;fill:#21394F}.monthSub{font-size:10px;font-weight:650;fill:#7A90A2}
          .legendText{font-size:14px;font-weight:750;fill:#536B7E}
          .footer{font-size:12px;font-weight:650;fill:#74899A}
        </style>
      </defs>
      <rect width="1600" height="900" fill="${bg}"/>
      <text x="72" y="72" class="title">월별 태풍 발생 통계</text>
      <text x="72" y="104" class="subtitle">${subtitle} · 파란색 전체 발생, 노란색 한국 영향</text>
      <text x="1528" y="64" text-anchor="end" class="eyebrow">NORTHEAST ASIA TYPHOON STATISTICS</text>
      <g transform="translate(1260 92)">
        <rect x="0" y="-9" width="10" height="10" rx="3" fill="#2F7FEA"/><text x="18" y="0" class="legendText">전체 발생</text>
        <rect x="120" y="-9" width="10" height="10" rx="3" fill="#F2B638"/><text x="138" y="0" class="legendText">한국 영향</text>
      </g>
      ${kpis}
      <rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" rx="22" fill="${chartFill}" stroke="#D8E3EC"/>
      ${gridLines}
      ${groups}
      <text x="72" y="727" font-size="14" font-weight="800" fill="#5C7386">연간 태풍 시즌 주의 구간</text>
      <text x="1528" y="727" text-anchor="end" font-size="14" font-weight="800" fill="#5C7386">7–9월 집중 관리</text>
      ${seasonCells}
      <line x1="72" y1="842" x2="1528" y2="842" stroke="#DCE5ED"/>
      <text x="72" y="873" class="footer">※ 한국 영향 값은 기상청 통계표의 괄호 안 수치입니다.</text>
      <text x="1528" y="873" text-anchor="end" class="footer">출처: 기상청 날씨누리 · 태풍발생현황 통계</text>
    </svg>`;
  }

  async function svgToPngBlob(svg, transparent) {
    const svgBlob = new Blob([svg], {type:"image/svg+xml;charset=utf-8"});
    const url = URL.createObjectURL(svgBlob);
    try {
      const img = new Image();
      const loaded = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("SVG 렌더링 실패"));
      });
      img.src = url;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_W * PNG_SCALE;
      canvas.height = EXPORT_H * PNG_SCALE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas를 만들 수 없습니다.");
      ctx.scale(PNG_SCALE, PNG_SCALE);
      if (!transparent) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0,0,EXPORT_W,EXPORT_H);
      }
      ctx.drawImage(img,0,0,EXPORT_W,EXPORT_H);

      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG 생성 실패")), "image/png", 1);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function runExport(type) {
    const buttons = backdrop.querySelectorAll("[data-export]");
    buttons.forEach(b => b.disabled = true);
    status.className = "chart-export-status busy";
    status.textContent = "고해상도 그래프 생성 중…";

    try {
      const state = getState();
      const transparent = type === "transparent";
      const svg = buildSvg(state, transparent);

      if (type === "svg") {
        downloadBlob(new Blob([svg], {type:"image/svg+xml;charset=utf-8"}), safeFilename(state.label,"svg"));
      } else {
        const blob = await svgToPngBlob(svg, transparent);
        downloadBlob(blob, safeFilename(state.label,"png",transparent ? "_투명" : "_화이트"));
      }

      status.className = "chart-export-status done";
      status.textContent = "저장이 시작되었습니다.";
      setTimeout(() => { if (!backdrop.hidden) closeDialog(); }, 850);
    } catch (err) {
      console.error(err);
      status.className = "chart-export-status error";
      status.textContent = err?.message || "저장 중 오류가 발생했습니다.";
    } finally {
      buttons.forEach(b => b.disabled = false);
    }
  }

  backdrop.querySelectorAll("[data-export]").forEach(button => {
    button.addEventListener("click", () => runExport(button.dataset.export));
  });
})();