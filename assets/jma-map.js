
(() => {
  "use strict";
  const JMA_BASE = "https://www.jma.go.jp/bosai/typhoon/data";
  const ARCHIVE_BASE = "https://www.data.jma.go.jp/typhoon";
  const AUTO_REFRESH_MS = 10 * 60 * 1000;
  const byId = id => document.getElementById(id);
  const mapPanel = byId("mapPanel");
  const mapWrap = byId("mapWrap");
  const jmaMapEl = byId("jmaMap");
  const weatherFrame = byId("weatherFrame");
  const jmaTab = byId("jmaTab");
  const kmaTab = byId("kmaTab");
  const toolbar = byId("jmaToolbar");
  const expandButton = byId("expandMap");
  const refreshButton = byId("refreshMap");
  const statusEl = byId("jmaDataStatus");
  const messageEl = byId("jmaMapMessage");
  const currentModeButton = byId("currentModeButton");
  const archiveModeButton = byId("archiveModeButton");
  const mapStyleSatellite = byId("mapStyleSatellite");
  const mapStyleStandard = byId("mapStyleStandard");
  const currentControls = byId("jmaCurrentControls");
  const archiveControls = byId("jmaArchiveControls");
  const activeSelect = byId("activeTyphoonSelect");
  const archiveYear = byId("archiveYear");
  const archiveStormSelect = byId("archiveStormSelect");
  const routeLink = byId("jmaRouteLink");
  const pdfLink = byId("jmaPdfLink");
  const mapTitle = byId("mapTitle");
  const mapDescription = byId("mapDescription");
  const mapBadge = byId("mapBadge");
  const mapLabel = byId("mapLabel");
  const sideCard = byId("jmaStormCard");
  const sideName = byId("jmaStormName");
  const sideCode = byId("jmaStormCode");
  const sidePressure = byId("jmaPressure");
  const sideWind = byId("jmaWind");
  const sideMove = byId("jmaMove");
  const sideSpeed = byId("jmaSpeed");
  const sideList = byId("jmaForecastList");
  if (!mapPanel || !jmaMapEl || !window.L) return;

  let map;
  let liveLayer = L.layerGroup();
  let archiveLayer = L.layerGroup();
  let activeProvider = "jma";
  let mode = "current";
  let lastTargetRefresh = 0;
  let targetCache = [];
  let archiveRows = [];
  let archiveStormMeta = new Map();
  let archivePdfTrackCache = new Map();
  let archiveYearLoaded = null;
  let standardBaseLayer = null;
  let satelliteBaseLayer = null;
  let activeBaseLayer = null;
  const MAP_STYLE_KEY = "typhoon-map-style";
  let mapStyle = (() => { try { return localStorage.getItem(MAP_STYLE_KEY) || "satellite"; } catch { return "satellite"; } })();

  const setStatus = (text, state="") => {
    statusEl.textContent = text;
    statusEl.className = "jma-status" + (state ? " " + state : "");
  };
  const setMessage = (text="") => {
    messageEl.textContent = text;
    messageEl.hidden = !text;
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const cacheBust = url => url + (url.includes("?") ? "&" : "?") + "_=" + Date.now();
  const fetchJson = async url => {
    const res = await fetch(cacheBust(url), {cache:"no-store"});
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  };
  const formatJst = value => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Tokyo",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(d).replace(".","/").replace(".","");
  };
  const formatArchiveTime = row => {
    const y=Number(row[0]),m=Number(row[1]),d=Number(row[2]),h=Number(row[3]);
    const utc = new Date(Date.UTC(y,m-1,d,h));
    const jst = new Date(utc.getTime()+9*3600*1000);
    return `${jst.getUTCMonth()+1}/${jst.getUTCDate()} ${String(jst.getUTCHours()).padStart(2,"0")}시`;
  };
  const pointFromReport = report => {
    const p = report?.position?.deg;
    return Array.isArray(p) && p.length >= 2 ? [Number(p[0]),Number(p[1])] : null;
  };
  const makeDot = className => L.divIcon({className:"",html:`<div class="${className}"></div>`,iconSize:[22,22],iconAnchor:[11,11]});
  const makeLabel = (html, current=false, archive=false) => L.divIcon({
    className:"",
    html:`<div class="${archive ? "jma-archive-label" : "jma-time-label" + (current ? " current" : "")}">${escapeHtml(html)}</div>`,
    iconAnchor:[-9,10]
  });

  function initMap(){
    map = L.map(jmaMapEl,{zoomControl:true,preferCanvas:true,worldCopyJump:true}).setView([31,135],4);

    const jmaTiles = L.tileLayer("https://www.jma.go.jp/tile/jma/gray-cities/{z}/{x}/{y}.png",{
      minZoom:2,maxZoom:12,maxNativeZoom:10,
      attribution:'<a href="https://www.jma.go.jp/" target="_blank" rel="noopener">JMA</a>'
    });
    const gsiTiles = L.tileLayer("https://maps.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",{
      minZoom:2,maxZoom:18,
      attribution:'<a href="https://maps.gsi.go.jp/" target="_blank" rel="noopener">GSI</a>'
    });
    standardBaseLayer = L.layerGroup([gsiTiles, jmaTiles]);

    const satelliteTiles = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{
      minZoom:2,maxZoom:18,
      attribution:'Tiles &copy; Esri'
    });
    const satelliteLabels = L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{
      minZoom:2,maxZoom:18,
      opacity:.9,
      attribution:'Sources: Esri, Garmin, FAO, NOAA, USGS and others'
    });
    satelliteBaseLayer = L.layerGroup([satelliteTiles, satelliteLabels]);

    let satelliteErrors=0;
    satelliteTiles.on("tileerror",()=>{
      satelliteErrors += 1;
      if(satelliteErrors >= 8 && mapStyle === "satellite"){
        setMapStyle("standard", false);
        setStatus("위성지도 연결 불안정 · 일반지도로 전환","error");
      }
    });

    setMapStyle(mapStyle, false);
    liveLayer.addTo(map);
  }

  function setMapStyle(style, remember=true){
    if(!map || !standardBaseLayer || !satelliteBaseLayer) return;
    const next = style === "standard" ? "standard" : "satellite";
    if(activeBaseLayer) map.removeLayer(activeBaseLayer);
    activeBaseLayer = next === "satellite" ? satelliteBaseLayer : standardBaseLayer;
    activeBaseLayer.addTo(map);
    mapStyle = next;
    jmaMapEl.classList.toggle("satellite-mode", next === "satellite");
    mapStyleSatellite?.setAttribute("aria-pressed", String(next === "satellite"));
    mapStyleStandard?.setAttribute("aria-pressed", String(next === "standard"));
    if(remember){
      try { localStorage.setItem(MAP_STYLE_KEY, next); } catch {}
    }
    requestAnimationFrame(()=>map.invalidateSize());
  }

  function fitTo(points){
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0],6);
    else map.fitBounds(L.latLngBounds(points),{padding:[44,44],maxZoom:6});
  }

  function updateSideCurrent(spec){
    const title = spec.find(x=>x.part==="title") || {};
    const reports = spec.filter(x=>typeof x.part==="object" && pointFromReport(x));
    const analysis = reports.find(x=>x.part?.en==="Analysis") || reports[0];
    sideCard.hidden = !analysis;
    if (!analysis) return;
    const no = String(title.typhoonNumber || "");
    const num = no.length >= 4 ? Number(no.slice(-2)) : no;
    const en = title.name?.en || "";
    const jp = title.name?.jp || "";
    sideName.textContent = `태풍 ${num || ""}호${en ? " " + en.toUpperCase() : ""}`;
    sideCode.textContent = jp || title.category?.jp || "JMA";
    sidePressure.textContent = analysis.pressure ? analysis.pressure + " hPa" : "—";
    const wind = analysis.maximumWind?.sustained?.["m/s"];
    sideWind.textContent = wind ? wind + " m/s" : "—";
    sideMove.textContent = analysis.course || "—";
    sideSpeed.textContent = analysis.speed?.["km/h"] ? analysis.speed["km/h"] + " km/h" : "—";
    const candidates = reports.filter(x=>Number(x.advancedHours||0)>=0);
    const selected = [];
    candidates.forEach((r,i)=>{
      if (i===0 || selected.length===0 || Number(r.advancedHours||0)-Number(selected[selected.length-1].advancedHours||0)>=18 || i===candidates.length-1) selected.push(r);
    });
    sideList.innerHTML = selected.slice(0,6).map(r=>{
      const p=pointFromReport(r);
      return `<div class="jma-forecast-row"><b>${escapeHtml(formatJst(r.validtime?.JST))}</b><span>${p ? p[0].toFixed(1)+"N · "+p[1].toFixed(1)+"E" : "—"}</span><em>${escapeHtml(r.pressure ? r.pressure+" hPa" : "")}</em></div>`;
    }).join("");
  }

  function renderLive(spec, forecast){
    liveLayer.clearLayers();
    const title = spec.find(x=>x.part==="title") || {};
    const reports = spec.filter(x=>typeof x.part==="object" && pointFromReport(x));
    const analysis = reports.find(x=>x.part?.en==="Analysis") || reports[0];
    const points = reports.map(pointFromReport).filter(Boolean);
    if (!analysis || !points.length){ setMessage("선택한 태풍의 위치 데이터를 읽지 못했습니다."); return; }
    setMessage("");
    const current = pointFromReport(analysis);
    const past = forecast?.find?.(x=>Number(x.advancedHours)===0)?.track || {};
    if (Array.isArray(past.preTyphoon) && past.preTyphoon.length>1) L.polyline(past.preTyphoon,{color:"#617f98",weight:2,dashArray:"5 6",opacity:.8}).addTo(liveLayer);
    if (Array.isArray(past.typhoon) && past.typhoon.length>1) L.polyline(past.typhoon,{color:"#0c6fb5",weight:3,opacity:.9}).addTo(liveLayer);
    L.polyline(points,{color:"#ef3151",weight:3,opacity:.95}).addTo(liveLayer);

    reports.forEach((r,i)=>{
      const p=pointFromReport(r);
      const isCurrent = Number(r.advancedHours||0)===0;
      if (r.probabilityCircleRadius?.km) L.circle(p,{radius:Number(r.probabilityCircleRadius.km)*1000,color:"#ef3151",weight:1.3,opacity:.65,fillColor:"#ef3151",fillOpacity:.055}).addTo(liveLayer);
      const marker=L.marker(p,{icon:makeDot(isCurrent?"jma-current-dot":"jma-forecast-dot"),zIndexOffset:isCurrent?300:100}).addTo(liveLayer);
      const label = formatJst(r.validtime?.JST);
      marker.bindPopup(`<strong>${escapeHtml(title.name?.en || "Tropical Cyclone")}</strong><br>${escapeHtml(label)}<br>중심기압 ${escapeHtml(r.pressure || "—")} hPa<br>최대풍속 ${escapeHtml(r.maximumWind?.sustained?.["m/s"] || "—")} m/s`);
      const showLabel = isCurrent || i===reports.length-1 || i%2===0 || Number(r.advancedHours||0)>=40;
      if (showLabel) L.marker(p,{icon:makeLabel(label,isCurrent,false),interactive:false,zIndexOffset:500}).addTo(liveLayer);
    });

    const allRange = arr => Array.isArray(arr) && arr.length===1 && arr[0]?.range?.km ? Number(arr[0].range.km) : null;
    const gale = allRange(analysis.galeWarning);
    const storm = allRange(analysis.stormWarning);
    if (gale) L.circle(current,{radius:gale*1000,color:"#e4b31a",weight:1.2,fillColor:"#ffd45b",fillOpacity:.06}).addTo(liveLayer);
    if (storm) L.circle(current,{radius:storm*1000,color:"#ef3151",weight:1.4,fillColor:"#ef3151",fillOpacity:.07}).addTo(liveLayer);
    fitTo(points.concat(Array.isArray(past.typhoon)?past.typhoon:[]));
    updateSideCurrent(spec);
    const no=String(title.typhoonNumber||"");
    const labelNo=no.length>=4?Number(no.slice(-2)):no;
    mapTitle.textContent=`JMA 태풍 ${labelNo || ""}호 ${title.name?.en ? title.name.en.toUpperCase() : ""}`.trim();
    mapDescription.textContent=`JMA 발표 ${formatJst(title.issue?.JST)} · 현재 위치와 5일 예상 진로`;
  }

  async function loadSelectedLive(){
    const tc=activeSelect.value;
    if (!tc) return;
    setStatus("JMA 예보 불러오는 중","loading");
    try{
      const [spec,forecast]=await Promise.all([
        fetchJson(`${JMA_BASE}/${tc}/specifications.json`),
        fetchJson(`${JMA_BASE}/${tc}/forecast.json`).catch(()=>[])
      ]);
      renderLive(spec,forecast);
      setStatus("JMA 최신 · "+new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date()),"ok");
      window.updateSyncTime?.();
    }catch(err){
      console.error(err);
      setStatus("JMA 데이터를 불러오지 못함","error");
      setMessage("JMA 데이터 연결에 실패했습니다. 잠시 후 새로고침해 주세요.");
    }
  }

  async function loadTargets(force=false){
    if (!force && Date.now()-lastTargetRefresh<60_000) return;
    setStatus("현재 태풍 확인 중","loading");
    try{
      const targets=await fetchJson(`${JMA_BASE}/targetTc.json`);
      lastTargetRefresh=Date.now();
      targetCache=Array.isArray(targets)?targets:[];
      const previous=activeSelect.value;
      activeSelect.innerHTML="";
      targetCache.forEach(t=>{
        const opt=document.createElement("option");
        opt.value=t.tropicalCyclone;
        const raw=String(t.typhoonNumber||"");
        opt.textContent=raw.length>2 ? `태풍 ${Number(raw.slice(-2))}호 · ${t.tropicalCyclone}` : `열대저기압 ${raw} · ${t.tropicalCyclone}`;
        activeSelect.appendChild(opt);
      });
      if (!targetCache.length){
        sideCard.hidden=true;
        setMessage("현재 JMA에서 발표 중인 태풍 정보가 없습니다.");
        setStatus("현재 발표 중 태풍 없음","ok");
        return;
      }
      if (targetCache.some(t=>t.tropicalCyclone===previous)) activeSelect.value=previous;
      else activeSelect.value=targetCache[targetCache.length-1].tropicalCyclone;
      await loadSelectedLive();
    }catch(err){
      console.error(err);
      setStatus("현재 태풍 목록 연결 실패","error");
      setMessage("JMA 현재 태풍 목록을 불러오지 못했습니다.");
    }
  }

  function parseCsvLine(line){
    const out=[]; let cur=""; let quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"'){
        if(quoted && line[i+1]==='"'){cur+='"';i++;} else quoted=!quoted;
      } else if(ch==="," && !quoted){out.push(cur.trim());cur="";}
      else cur+=ch;
    }
    out.push(cur.trim());
    return out;
  }
  async function fetchArchiveCsv(year){
    const res=await fetch(cacheBust(`${ARCHIVE_BASE}/position_table/table${year}.csv`),{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const buf=await res.arrayBuffer();
    let text;
    try{text=new TextDecoder("shift_jis").decode(buf);}catch{ text=new TextDecoder("utf-8").decode(buf); }
    return text.split(/\r?\n/).filter(Boolean).map(parseCsvLine).filter(r=>r.length>=11 && /^\d{4}$/.test(String(r[4]||"")));
  }
  async function fetchArchiveIndex(year){
    const res=await fetch(cacheBust(`${ARCHIVE_BASE}/position_table/table${year}.html`),{cache:"no-store"});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const html=await res.text();
    const doc=new DOMParser().parseFromString(html,"text/html");
    const yy=String(year).slice(-2);
    const storms=new Map();
    doc.querySelectorAll('a[href*="/typhoon/data/T"],a[href*="../data/T"],a[href*="data/T"]').forEach(a=>{
      const href=a.getAttribute("href")||"";
      const m=href.match(/T(\d{2})(\d{2})\.pdf/i);
      if(!m || m[1]!==yy) return;
      const code=m[1]+m[2];
      const context=(a.closest("li")?.textContent || a.parentElement?.textContent || a.textContent || "").replace(/\s+/g," ").trim();
      const provisional=context.includes("※");
      storms.set(code,{
        provisional,
        pdf:new URL(href,`${ARCHIVE_BASE}/position_table/table${year}.html`).href
      });
    });
    return storms;
  }
  async function fetchArchivePdfTrack(storm){
    if(archivePdfTrackCache.has(storm)) return archivePdfTrackCache.get(storm);
    const task=(async()=>{
    if(!window.pdfjsLib) throw new Error("PDF parser unavailable");
    const meta=archiveStormMeta.get(storm)||{};
    const url=meta.pdf || `${ARCHIVE_BASE}/data/T${storm}.pdf`;
    const res=await fetch(cacheBust(url),{cache:"no-store"});
    if(!res.ok) throw new Error("PDF HTTP "+res.status);
    const data=new Uint8Array(await res.arrayBuffer());
    const pdf=await window.pdfjsLib.getDocument({data}).promise;
    const lines=[];
    let allText="";
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo);
      const content=await page.getTextContent();
      const grouped=new Map();
      content.items.forEach(item=>{
        const text=String(item.str||"").trim();
        if(!text) return;
        const x=Number(item.transform?.[4]||0);
        const y=Number(item.transform?.[5]||0);
        const key=Math.round(y/2)*2;
        if(!grouped.has(key)) grouped.set(key,[]);
        grouped.get(key).push({x,text});
      });
      [...grouped.entries()].sort((a,b)=>b[0]-a[0]).forEach(([,items])=>{
        const line=items
          .sort((a,b)=>a.x-b.x)
          .map(v=>v.text)
          .join(" ")
          .replace(/\s+/g," ")
          .trim();
        if(line){lines.push(line);allText+=" "+line;}
      });
    }

    const titleMatch=allText.match(/(?:\d{4}年)?台風第\s*\d+\s*号\s+([A-Z][A-Z0-9-]*)\s*\(\s*\d{4}\s*\)/i);
    const name=titleMatch?.[1]||"";
    const rows=[];
    let month=null,day=null;
    let lastLatDir="N",lastLonDir="E";

    for(const line of lines){
      // JMA速報PDFは最初の行では "8.5 N 136.6 E"、以降は
      // "9.1 136.5" のように N/E を省略するため両形式を許容する。
      const m=line.match(/^(.*?)\b(\d{1,2}(?:\.\d+)?)\s*(?:([NS])\s*)?(\d{2,3}(?:\.\d+)?)\s*(?:([EW])\s*)?(\d{3,4}|--|---)\s+(\d{1,3}|--|---)\b/i);
      if(!m) continue;

      const prefixNums=(m[1].match(/\d{1,4}/g)||[]).map(Number);
      if(!prefixNums.length) continue;

      let hour=null;
      if(prefixNums.length>=3){
        const vals=prefixNums.slice(-3);
        month=vals[0]; day=vals[1]; hour=vals[2];
      }else if(prefixNums.length===2){
        day=prefixNums[0]; hour=prefixNums[1];
      }else{
        hour=prefixNums[0];
      }
      if(!(month>=1&&month<=12&&day>=1&&day<=31&&hour>=0&&hour<=23)) continue;

      const latDir=(m[3]||lastLatDir||"N").toUpperCase();
      const lonDir=(m[5]||lastLonDir||"E").toUpperCase();
      lastLatDir=latDir; lastLonDir=lonDir;

      let lat=Number(m[2]),lon=Number(m[4]);
      if(latDir==="S") lat=-lat;
      if(lonDir==="W") lon=-lon;
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) continue;

      const pressure=/^\d+$/.test(m[6])?Number(m[6]):null;
      const wind=/^\d+$/.test(m[7])?Number(m[7]):null;
      const key=`${month}-${day}-${hour}-${lat}-${lon}`;
      if(rows.some(r=>r.key===key)) continue;

      rows.push({
        key,month,day,hour,lat,lon,pressure,wind,
        label:`${month}/${day} ${String(hour).padStart(2,"0")}시`
      });
    }

    return {rows,name,url};
    })();
    archivePdfTrackCache.set(storm,task);
    try{return await task;}catch(err){archivePdfTrackCache.delete(storm);throw err;}
  }
  function updateArchiveStormOption(no,name){
    if(!name) return;
    const meta=archiveStormMeta.get(no)||{};
    archiveStormMeta.set(no,{...meta,name});
    const option=[...archiveStormSelect.options].find(o=>o.value===no);
    if(option) option.textContent=`태풍 ${Number(no.slice(-2))}호 · ${name}`;
  }

  async function hydrateArchiveStormNames(storms){
    const targets=[...storms.keys()].filter(no=>{
      const meta=archiveStormMeta.get(no);
      return meta?.provisional && !meta?.name;
    });
    let cursor=0;
    const worker=async()=>{
      while(cursor<targets.length){
        const no=targets[cursor++];
        try{
          const track=await fetchArchivePdfTrack(no);
          if(track?.name) updateArchiveStormOption(no,track.name);
        }catch(err){
          console.warn("JMA archive name load failed",no,err);
        }
      }
    };
    await Promise.all(Array.from({length:Math.min(3,targets.length)},()=>worker()));
  }

  function updateArchiveLinks(){
    const year=archiveYear.value;
    const storm=archiveStormSelect.value;
    routeLink.href=`${ARCHIVE_BASE}/route_map/bstv${year}.html`;
    const yy=String(year).slice(-2);
    const nn=String(storm||"").slice(-2).padStart(2,"0");
    pdfLink.href=storm ? `${ARCHIVE_BASE}/data/T${yy}${nn}.pdf` : routeLink.href;
  }
  async function renderArchiveStorm(){
    archiveLayer.clearLayers();
    const storm=archiveStormSelect.value;
    updateArchiveLinks();
    const rows=archiveRows.filter(r=>String(r[4])===storm);
    if(!rows.length){
      const meta=archiveStormMeta.get(storm);
      const provisional=meta?.provisional;
      if(provisional){
        setStatus(`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 PDF 분석 중`,"loading");
        setMessage("JMA 속보 위치표 PDF에서 경로를 불러오는 중입니다.");
        try{
          const pdfTrack=await fetchArchivePdfTrack(storm);
          const pdfRows=pdfTrack.rows;
          if(pdfTrack.name) updateArchiveStormOption(storm,pdfTrack.name);
          if(!pdfRows.length) throw new Error("no PDF track rows");
          const pts=pdfRows.map(r=>[r.lat,r.lon]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
          if(pts.length>1){
            L.polyline(pts,{color:"#ffffff",weight:7,opacity:.96,dashArray:"10 6",lineCap:"round",lineJoin:"round"}).addTo(archiveLayer);
            L.polyline(pts,{color:"#ff8a00",weight:3.6,opacity:1,dashArray:"10 6",lineCap:"round",lineJoin:"round"}).addTo(archiveLayer);
          }
          pdfRows.forEach((r,i)=>{
            const p=[r.lat,r.lon];
            const marker=L.marker(p,{icon:makeDot("jma-history-dot")}).addTo(archiveLayer);
            marker.bindPopup(`<strong>${escapeHtml(pdfTrack.name||storm)}</strong><br>${escapeHtml(r.label)}<br>중심기압 ${r.pressure??"—"} hPa<br>최대풍속 ${r.wind??"—"} m/s`);
            if(i===0||i===pdfRows.length-1||i%4===0) L.marker(p,{icon:makeLabel(r.label,false,true),interactive:false,zIndexOffset:400}).addTo(archiveLayer);
          });
          fitTo(pts);
          const pressures=pdfRows.map(r=>r.pressure).filter(Number.isFinite);
          const winds=pdfRows.map(r=>r.wind).filter(Number.isFinite);
          sideCard.hidden=false;
          sideName.textContent=`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 ${pdfTrack.name}`.trim();
          sideCode.textContent="JMA QUICK ANALYSIS · 속보";
          sidePressure.textContent=pressures.length?Math.min(...pressures)+" hPa":"—";
          sideWind.textContent=winds.length?Math.max(...winds)+" m/s":"—";
          sideMove.textContent="속보 경로";
          sideSpeed.textContent=pdfRows.length+" records";
          sideList.innerHTML=`<div class="jma-archive-actions"><a class="jma-link-button" href="${routeLink.href}" target="_blank" rel="noopener">JMA 경로도 ↗</a><a class="jma-link-button" href="${pdfTrack.url}" target="_blank" rel="noopener">위치표 PDF ↗</a></div>`;
          mapTitle.textContent=`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 ${pdfTrack.name}`.trim();
          mapDescription.textContent="JMA 속보 위치표 PDF · 경로 재생";
          setMessage("");
          setStatus(`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 · 속보 경로`,"ok");
          return;
        }catch(err){
          console.error(err);
          setMessage("속보 PDF 경로를 지도에 변환하지 못했습니다. 아래 JMA 공식 경로도·위치표 PDF에서 확인할 수 있습니다.");
        }
      }else{
        setMessage("선택한 태풍의 확정 경로 데이터가 없습니다. 아래 JMA 공식 경로도·위치표 PDF에서 확인할 수 있습니다.");
      }
      archiveLayer.clearLayers();
      sideCard.hidden=false;
      sideName.textContent=`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호`;
      sideCode.textContent=provisional ? "JMA QUICK ANALYSIS · 속보" : "JMA ARCHIVE";
      sidePressure.textContent="—";
      sideWind.textContent="—";
      sideMove.textContent=provisional ? "속보 경로" : "과거 경로";
      sideSpeed.textContent="JMA 공식 자료";
      sideList.innerHTML=`<div class="jma-archive-actions"><a class="jma-link-button" href="${routeLink.href}" target="_blank" rel="noopener">JMA 경로도 ↗</a><a class="jma-link-button" href="${pdfLink.href}" target="_blank" rel="noopener">위치표 PDF ↗</a></div>`;
      mapTitle.textContent=`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호`;
      mapDescription.textContent=provisional ? "JMA 속보 분석 · 공식 자료 연결" : "JMA 과거 자료";
      setStatus(`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 · ${provisional?"속보":"과거"}`,"ok");
      return;
    }
    setMessage("");
    const pts=rows.map(r=>[Number(r[7]),Number(r[8])]).filter(p=>Number.isFinite(p[0])&&Number.isFinite(p[1]));
    if(pts.length>1){
      L.polyline(pts,{color:"#ffffff",weight:7,opacity:.96,lineCap:"round",lineJoin:"round"}).addTo(archiveLayer);
      L.polyline(pts,{color:"#ff8a00",weight:3.6,opacity:1,lineCap:"round",lineJoin:"round"}).addTo(archiveLayer);
    }
    rows.forEach((r,i)=>{
      const p=[Number(r[7]),Number(r[8])];
      if(!Number.isFinite(p[0])||!Number.isFinite(p[1])) return;
      const marker=L.marker(p,{icon:makeDot("jma-history-dot")}).addTo(archiveLayer);
      const t=formatArchiveTime(r);
      marker.bindPopup(`<strong>${escapeHtml(r[5]||storm)}</strong><br>${escapeHtml(t)}<br>중심기압 ${escapeHtml(r[9]||"—")} hPa<br>최대풍속 ${escapeHtml(r[10]||"—")} kt`);
      if(i===0||i===rows.length-1||i%4===0) L.marker(p,{icon:makeLabel(t,false,true),interactive:false,zIndexOffset:400}).addTo(archiveLayer);
    });
    fitTo(pts);
    const name=rows.find(r=>r[5])?.[5] || "";
    const pressures=rows.map(r=>Number(r[9])).filter(Number.isFinite);
    const winds=rows.map(r=>Number(r[10])).filter(Number.isFinite);
    sideCard.hidden=false;
    sideName.textContent=`${storm.slice(0,2)}년 태풍 ${Number(storm.slice(-2))}호 ${name}`.trim();
    sideCode.textContent="JMA BEST TRACK";
    sidePressure.textContent=pressures.length?Math.min(...pressures)+" hPa":"—";
    sideWind.textContent=winds.length?Math.max(...winds)+" kt":"—";
    sideMove.textContent="과거 경로";
    sideSpeed.textContent=rows.length+" records";
    sideList.innerHTML=`<div class="jma-archive-actions"><a class="jma-link-button" href="${routeLink.href}" target="_blank" rel="noopener">JMA 경로도 ↗</a><a class="jma-link-button" href="${pdfLink.href}" target="_blank" rel="noopener">위치표 PDF ↗</a></div>`;
    mapTitle.textContent=`${archiveYear.value}년 태풍 ${Number(storm.slice(-2))}호 ${name}`.trim();
    mapDescription.textContent="JMA 과거 위치표 · 경로 재생";
    setStatus(`${archiveYear.value}년 과거 태풍`,"ok");
  }
  async function loadArchiveYear(force=false){
    const year=archiveYear.value;
    if(!force && archiveYearLoaded===year && archiveRows.length){renderArchiveStorm();return;}
    setStatus(`${year}년 자료 불러오는 중`,"loading");
    setMessage("");
    archiveStormSelect.innerHTML='<option value="">불러오는 중…</option>';
    try{
      const [csvRows,indexStorms]=await Promise.all([
        fetchArchiveCsv(year).catch(()=>[]),
        fetchArchiveIndex(year).catch(()=>new Map())
      ]);
      archiveRows=csvRows;
      archiveYearLoaded=year;
      const storms=new Map();
      archiveStormMeta=new Map(indexStorms);
      archiveRows.forEach(r=>{
        const no=String(r[4]);
        if(!storms.has(no)) storms.set(no,r[5]||"");
        const existing=archiveStormMeta.get(no)||{};
        archiveStormMeta.set(no,{...existing,provisional:false});
      });
      archiveStormMeta.forEach((meta,no)=>{ if(!storms.has(no)) storms.set(no,""); });
      archiveStormSelect.innerHTML="";
      [...storms.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([no,name])=>{
        const meta=archiveStormMeta.get(no);
        const o=document.createElement("option");
        o.value=no;
        const displayName=name || meta?.name || "";
        o.textContent=`태풍 ${Number(no.slice(-2))}호${displayName?" · "+displayName:""}`;
        archiveStormSelect.appendChild(o);
      });
      if(!storms.size) throw new Error("no archive rows");
      archiveStormSelect.value=[...storms.keys()].sort().at(-1);
      renderArchiveStorm();
      hydrateArchiveStormNames(storms);
    }catch(err){
      console.error(err);
      archiveRows=[]; archiveStormMeta=new Map(); archiveYearLoaded=year;
      archiveStormSelect.innerHTML='<option value="">공식 경로도에서 선택</option>';
      updateArchiveLinks();
      archiveLayer.clearLayers();
      sideCard.hidden=false;
      sideName.textContent=`${year}년 과거 태풍`; sideCode.textContent="JMA ARCHIVE";
      sidePressure.textContent="—";sideWind.textContent="—";sideMove.textContent="공식 자료";sideSpeed.textContent="연도별";
      sideList.innerHTML=`<div class="jma-archive-actions"><a class="jma-link-button" href="${routeLink.href}" target="_blank" rel="noopener">JMA 연도별 경로도 ↗</a></div>`;
      setMessage("브라우저에서 과거 CSV를 직접 읽을 수 없어 JMA 공식 경로도로 연결합니다.");
      setStatus("JMA 공식 아카이브 연결","error");
    }
  }

  async function setMode(next){
    mode=next;
    const archive=next==="archive";
    currentModeButton.setAttribute("aria-pressed",String(!archive));
    archiveModeButton.setAttribute("aria-pressed",String(archive));
    currentControls.hidden=archive;
    archiveControls.hidden=!archive;
    if(archive){
      map.removeLayer(liveLayer); if(!map.hasLayer(archiveLayer)) archiveLayer.addTo(map);
      await loadArchiveYear();
    }else{
      map.removeLayer(archiveLayer); if(!map.hasLayer(liveLayer)) liveLayer.addTo(map);
      await loadTargets(true);
    }
  }
  function setProvider(provider){
    activeProvider=provider;
    const jma=provider==="jma";
    jmaMapEl.hidden=!jma; weatherFrame.hidden=jma; toolbar.hidden=!jma;
    jmaTab.setAttribute("aria-selected",String(jma)); kmaTab.setAttribute("aria-selected",String(!jma));
    mapBadge.textContent=jma?"JMA OFFICIAL":"KMA OFFICIAL";
    mapLabel.textContent=jma?"일본 기상청(JMA) 공식 태풍 데이터로 현재 위치·예보원·경로를 표시합니다.":"한국 기상청이 제공하는 공식 태풍 상세정보 화면입니다.";
    if(jma){ requestAnimationFrame(()=>map.invalidateSize()); if(mode==="current") loadTargets(false); }
    else { mapTitle.textContent="한국 기상청 현재 태풍정보"; mapDescription.textContent="태풍 위치·예상 경로·강도·중심기압"; }
  }
  function fillYears(){
    const now=new Date().getFullYear();
    archiveYear.innerHTML="";
    for(let y=now;y>=1951;y--){const o=document.createElement("option");o.value=String(y);o.textContent=y+"년";archiveYear.appendChild(o);}
    archiveYear.value=String(now);
  }
  async function manualRefresh(){
    refreshButton.disabled=true;refreshButton.textContent="업데이트 중…";
    try{
      if(activeProvider==="kma"){
        const u=new URL(weatherFrame.src);u.searchParams.set("refresh",Date.now());weatherFrame.src=u.toString();
      }else if(mode==="archive") await loadArchiveYear(true);
      else await loadTargets(true);
      window.updateSyncTime?.();
    }finally{
      refreshButton.disabled=false;refreshButton.textContent="지도 새로고침";
    }
  }

  initMap(); fillYears();
  jmaTab.addEventListener("click",()=>setProvider("jma"));
  kmaTab.addEventListener("click",()=>setProvider("kma"));
  currentModeButton.addEventListener("click",()=>setMode("current"));
  archiveModeButton.addEventListener("click",()=>setMode("archive"));
  mapStyleSatellite?.addEventListener("click",()=>setMapStyle("satellite", true));
  mapStyleStandard?.addEventListener("click",()=>setMapStyle("standard", true));
  activeSelect.addEventListener("change",loadSelectedLive);
  archiveYear.addEventListener("change",()=>loadArchiveYear(true));
  archiveStormSelect.addEventListener("change",renderArchiveStorm);
  refreshButton.addEventListener("click",manualRefresh);
  expandButton.addEventListener("click",()=>{
    const expanded=!mapPanel.classList.contains("is-expanded");
    mapPanel.classList.toggle("is-expanded",expanded);document.body.classList.toggle("map-expanded",expanded);
    expandButton.textContent=expanded?"닫기":"전체화면";expandButton.setAttribute("aria-pressed",String(expanded));
    setTimeout(()=>map.invalidateSize(),80);
  });
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&mapPanel.classList.contains("is-expanded")){
      mapPanel.classList.remove("is-expanded");document.body.classList.remove("map-expanded");expandButton.textContent="전체화면";expandButton.setAttribute("aria-pressed","false");setTimeout(()=>map.invalidateSize(),80);
    }
  });
  new ResizeObserver(()=>map.invalidateSize()).observe(mapWrap);
  setProvider("jma");
  loadTargets(true);
  setInterval(()=>{ if(mode==="current") loadTargets(true); },AUTO_REFRESH_MS);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&mode==="current"&&Date.now()-lastTargetRefresh>AUTO_REFRESH_MS) loadTargets(true); });
})();
