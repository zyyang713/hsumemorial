// content-loader.js — v7 (home: link/numeric stats + representative works with href)
(function(){
  // --- Utils ---
  window.DEBUG_CONTENT = window.DEBUG_CONTENT || false;
  function log(...args){ if(window.DEBUG_CONTENT) console.log("[content]", ...args); }

  const currentScript =
    document.currentScript ||
    Array.from(document.scripts).find(s => (s.src||"").includes("content-loader.js")) ||
    document.scripts[document.scripts.length-1];

  let siteBase = "/";
  if (currentScript && currentScript.src) {
    try {
      const u = new URL(currentScript.src, location.href);
      siteBase = u.pathname.replace(/\/js\/content-loader\.js.*$/, "/");
      if (!siteBase.endsWith("/")) siteBase += "/";
    } catch(e){}
  }

  function resolve(path){
    if (!path) return path;
    if (/^https?:\/\//.test(path)) return path;
    if (path.startsWith("/")) return path;
    return siteBase + path.replace(/^\.?\//, "");
  }

  async function loadJSON(path){
    const url = resolve(path) + (path.includes("?") ? "" : `?v=${Date.now()}`);
    log("fetch", url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`載入失敗：${url} (${res.status})`);
    return res.json();
  }

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function escapeHtml(str){
    return String(str||"").replace(/[&<>"']/g, m => (
      {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]
    ));
  }
  function escapeAttr(str){ return escapeHtml(str); }

  function headingContains(text){
    const hs = $all("h1,h2,h3,h4,h5");
    return hs.find(h => h.textContent.replace(/\s+/g,"").includes(text.replace(/\s+/g,"")));
  }
  function findAfterHeading(text, selector){
    const h = headingContains(text);
    if (!h) return null;
    let el = h.nextElementSibling;
    while (el) {
      if (el.matches && el.matches(selector)) return el;
      el = el.nextElementSibling;
    }
    return null;
  }

  // --- Entry ---
  document.addEventListener("DOMContentLoaded", async () => {
    const p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    try {
      if (p.includes("papers")) await renderPapers();
      if (p.includes("presentation")) await renderPresentations();
      if (p.includes("biography")) await renderBiography();
      if (p === "" || p === "index.html") await renderHome();
    } catch(err){ console.error("[content] 渲染錯誤：", err); }
  });

  // --- Pages ---
  async function renderPapers(){
    try{
      const personal = await loadJSON("content/papers_personal.json");
      const supervised = await loadJSON("content/papers_supervised.json");

      const tbody = $("#personal-table-body");
      const counter = $("#personal-count");
      if (tbody) {
        tbody.innerHTML = personal.map((it) => {
          const titleHtml = it.file_url
            ? `<a class="text-amber-800 hover:underline decoration-amber-400 underline-offset-2" target="_blank" rel="noopener" href="${escapeAttr(it.file_url)}">${escapeHtml(it.title || "")}</a>`
            : `${escapeHtml(it.title || "")}`;
          const catBadge = `<span class="category-badge">${escapeHtml(it.category || "")}</span>`;
          return `
          <tr class="border-b border-amber-200 hover:bg-amber-50 transition-colors">
            <td class="py-4 px-4 text-gray-600">${it.no ?? ""}</td>
            <td class="py-4 px-4 text-gray-800 font-medium">${titleHtml}</td>
            <td class="py-4 px-4 text-gray-600">${it.year ?? ""}</td>
            <td class="py-4 px-4 text-gray-600">${escapeHtml(it.source || "")}</td>
            <td class="py-4 px-4 text-gray-600">${escapeHtml(it.pages || "")}</td>
            <td class="py-4 px-4">${catBadge}</td>
          </tr>`;
        }).join("");
        if (counter) counter.textContent = String(personal.length);
      }

      const tbody2 = $("#supervised-table-body");
      const counter2 = $("#supervised-count");
      if (tbody2) {
        tbody2.innerHTML = supervised.map((it) => {
          const titleHtml = it.url
            ? `<a class="text-amber-800 hover:underline decoration-amber-400 underline-offset-2" target="_blank" rel="noopener" href="${escapeAttr(it.url)}">${escapeHtml(it.thesis_title || "")}</a>`
            : `${escapeHtml(it.thesis_title || "")}`;
          return `
          <tr class="border-b border-amber-200 hover:bg-amber-50 transition-colors">
            <td class="py-4 px-4 text-gray-600">${it.no ?? ""}</td>
            <td class="py-4 px-4 text-gray-800 font-medium">${titleHtml}</td>
            <td class="py-4 px-4 text-gray-600">${escapeHtml(it.author || "")}</td>
            <td class="py-4 px-4 text-gray-600">${escapeHtml(it.dept || "")}</td>
            <td class="py-4 px-4 text-gray-600">${it.grad_year ?? ""}</td>
            <td class="py-4 px-4 text-gray-600">${escapeHtml(it.degree || "")}</td>
          </tr>`;
        }).join("");
        if (counter2) counter2.textContent = String(supervised.length);
      }
    }catch(e){ console.warn("學術論文資料載入失敗：", e); }
  }

  async function renderPresentations(){
    try{
      let list = null;
      for (const src of ["content/presentations.json", "presentations.json"]) {
        try { list = await loadJSON(src); break; } catch(e) {}
      }
      if (!list) return;

      const container = document.getElementById("lectureContainer");
      const totalEl = document.getElementById("totalCount");
      const visEl = document.getElementById("visibleCount");
      if (!container) return;

      list.sort((a, b) => String(b.date).localeCompare(String(a.date)));

      container.innerHTML = list.map(it => {
        const year = String(it.date || "").slice(0, 4);
        const title = it.title || "";
        const location = it.location || "";
        const hasVideo  = !!(it.video_url && it.video_url.trim());
        const hasSlides = !!(it.slides_url && it.slides_url.trim());
        return `
      <div class="lecture-card bg-white/80 rounded-xl shadow-md border border-amber-200 p-6 hover:shadow-lg transition-all duration-300"
           data-year="${escapeAttr(year)}"
           data-title="${escapeAttr(title)}"
           data-location="${escapeAttr(location)}">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 class="text-xl font-semibold text-amber-900 mb-1">${escapeHtml(title)}</h3>
            <p class="text-gray-700">${escapeHtml(location)}｜${escapeHtml(it.date || "")}</p>
          </div>
          <div class="flex gap-3">
            ${hasSlides ? `<a class="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200" target="_blank" rel="noopener" href="${escapeAttr(it.slides_url)}">投影片</a>` : ""}
            ${hasVideo  ? `<a class="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200" target="_blank" rel="noopener" href="${escapeAttr(it.video_url)}">影片</a>` : ""}
          </div>
        </div>
      </div>`;
      }).join("");

      if (totalEl) totalEl.textContent = String(list.length);
      if (visEl)   visEl.textContent   = String(list.length);

      const yearSel = document.getElementById("yearFilter");
      if (yearSel) {
        const cur = yearSel.value || "";
        const years = Array.from(new Set(list.map(it => String(it.date || "").slice(0,4)).filter(Boolean)))
                      .sort((a,b) => b.localeCompare(a));
        yearSel.innerHTML = `<option value="">全部年份</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");
        if (years.includes(cur)) yearSel.value = cur;
      }

      window.dispatchEvent(new CustomEvent("presentations:rendered"));
    }catch(e){ console.warn("演講紀錄載入失敗：", e); }
  }

  async function renderBiography(){
    try{
      const data = await loadJSON("content/biography.json");
      const intro = document.getElementById("bio-intro");
      if (intro && Array.isArray(data.intro_paragraphs)) {
        intro.innerHTML = data.intro_paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("\n");
      }
      const qWrap = document.getElementById("quotesList");
      if (qWrap && Array.isArray(data.quotes)) {
        qWrap.innerHTML = data.quotes.map(q => `
          <div class="quote-box rounded-xl p-8 shadow-lg">
            <p class="text-lg text-gray-800 leading-relaxed mb-4 pl-8">${escapeHtml(q.text || "")}</p>
            ${q.source ? `<p class="text-right text-amber-700 font-medium">— ${escapeHtml(q.source)}</p>` : ""}
          </div>`).join("");
      }
    }catch(e){ console.warn("簡歷資料載入失敗：", e); }
  }

  async function renderHome(){
    try{
      const data = await loadJSON("content/home.json");

      // --- HERO ---
      let hTitle = document.getElementById("heroTitle");
      let hSub   = document.getElementById("heroSubtitle");
      let hIntro = document.getElementById("heroIntro");
      if (!hTitle) hTitle = document.querySelector("main h2, h1");
      if (!hSub)   hSub   = document.querySelector('p[class*="text-amber-700"]');
      if (!hIntro) hIntro = document.querySelector('p[class*="text-gray-700"][class*="max-w-3xl"]') || document.querySelector('p.text-gray-700');
      if (hTitle && (data.hero?.name || data.hero?.title)) hTitle.textContent = data.hero.name || data.hero.title;
      if (hSub && (data.hero?.subtitle_detail || data.hero?.subtitle)) hSub.textContent = data.hero.subtitle_detail || data.hero.subtitle;
      if (hIntro && data.hero?.intro) hIntro.textContent = data.hero.intro;

      // --- 成就（數字版 / 連結版 自動切換）---
      const statsWrap = document.getElementById("achvStats");
      const stats = Array.isArray(data.achievements?.stats) ? data.achievements.stats : [];
      if (statsWrap && stats.length) {
        // 先隱藏，避免舊畫面閃爍
        const prevVis = statsWrap.style.visibility;
        statsWrap.style.visibility = 'hidden';

        const useLinks = stats.some(s => s.href || s.icon || s.value == null || s.value === "");
        if (useLinks) {
          statsWrap.innerHTML = stats.map(s => `
            <a href="${escapeAttr(s.href || '#')}"
               class="block p-6 rounded-lg text-center hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition">
              <div class="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-inner">
                <span class="text-2xl">${escapeHtml(s.icon || '⭐')}</span>
              </div>
              <h4 class="text-lg font-semibold text-amber-800">${escapeHtml(s.label || '')}</h4>
            </a>`).join('');
        } else {
          statsWrap.innerHTML = stats.map(s => {
            const num = `${s.value ?? ""}${s.suffix ?? ""}`;
            return `
              <div class="p-4 text-center">
                ${num ? `<div class="text-3xl font-bold text-amber-700 mb-2">${escapeHtml(String(num))}</div>` : ''}
                <p class="text-gray-600 text-sm">${escapeHtml(s.label || "")}</p>
              </div>`;
          }).join('');
        }

        statsWrap.style.visibility = prevVis || '';
      }

      // --- 重要榮譽 ---
      const honors = document.getElementById("honorsList") || findAfterHeading("重要榮譽", "ul");
      if (honors && Array.isArray(data.achievements?.honors)) {
        honors.innerHTML = data.achievements.honors.map(h => `<li>• ${escapeHtml(h)}</li>`).join("");
      }

      // --- 代表著作（支援字串/物件）---
      const repUl = document.getElementById("repWorksList") || findAfterHeading("代表著作","ul");
      const repItems = (data.achievements?.representative_works || data.achievements?.representativeWorks || []);
      if (repUl) {
        repUl.innerHTML = repItems.map(item => {
          if (typeof item === 'string') {
            return `<li>• ${escapeHtml(item)}</li>`;
          } else {
            const t = escapeHtml(item.title || '');
            const href = escapeAttr(item.href || '#');
            return `<li>• <a href="${href}" target="_blank" rel="noopener"
                         class="text-amber-800 hover:text-amber-900 no-underline hover:underline hover:decoration-amber-400 hover:underline-offset-2 transition-colors">${t}</a></li>`;
          }
        }).join('');
      }

      // --- 最新動態（維持原本寫法）---
      let newsGrid = document.getElementById("newsGrid");
      if (!newsGrid) {
        const h = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5")).find(x => x.textContent.includes("最新動態"));
        let el = h && h.nextElementSibling;
        while (el && !(el.matches && el.matches("div.grid"))) el = el?.nextElementSibling;
        newsGrid = el || newsGrid;
      }
      if (newsGrid && Array.isArray(data.news)) {
        window.navigateTo = window.navigateTo || function(section){
          if (!section) return;
          if (section === "papers") location.href = "papers.html";
          else if (section === "presentation") location.href = "presentation.html";
          else if (section === "biography") location.href = "biography.html";
          else location.href = section;
        };
        newsGrid.innerHTML = data.news.map(n => {
          const btn = n.link_section
            ? `<button onclick="navigateTo('${escapeAttr(n.link_section)}')" class="text-amber-700 hover:text-amber-900 text-sm font-medium">${escapeHtml(n.link_text || "前往 →")}</button>`
            : `<a href="${escapeAttr(n.url || "#")}" target="_blank" rel="noopener" class="text-amber-700 hover:text-amber-900 text-sm font-medium">${escapeHtml(n.link_text || "前往 →")}</a>`;
          return `
          <div class="section-card bg-white/80 rounded-xl p-6 shadow-lg">
            <div class="flex items-start space-x-4">
              <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span class="text-xl">${escapeHtml(n.icon || "📝")}</span>
              </div>
              <div>
                <h4 class="text-lg font-semibold text-amber-800 mb-2">${escapeHtml(n.title || "")}</h4>
                <p class="text-gray-600 text-sm mb-3">${escapeHtml(n.description || "")}</p>
                ${btn}
              </div>
            </div>
          </div>`;
        }).join("");
      }

      if (window.DEBUG_CONTENT) {
        const ids = ["heroTitle","heroSubtitle","heroIntro","achvStats","honorsList","repWorksList"];
        console.table(ids.map(id => ({ id, present: !!document.getElementById(id) })));
      }
    }catch(e){ console.warn("首頁資料載入失敗：", e); }
  }

})();
