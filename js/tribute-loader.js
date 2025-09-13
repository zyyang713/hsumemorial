// js/tribute-loader.js v1.4
// - 支援最小欄位：id/title/author/file/excrept(excerpt)
// - 圖片相對路徑自動補（Markdown/HTML）
// - Markdown 圖片若含 title → 自動包成 <figure>/<figcaption>（小標）
// - 自動隱藏年份/標籤篩選（若無 date/tags）
// - 支援子資料夾文章、一篇一資料夾
(function(){
  const DEBUG = !!window.DEBUG_TRIBUTES;
  const log  = (...a)=>DEBUG&&console.log("[tributes]",...a);
  const warn = (...a)=>console.warn("[tributes]",...a);

  // 以這支 script 的 URL 推算 repo 基底（支援 GitHub Pages 子路徑）
  const currentScript = document.currentScript || Array.from(document.scripts).find(s => (s.src||"").includes("tribute-loader.js"));
  let REPO_BASE = "/";
  if (currentScript && currentScript.src) {
    try {
      const u = new URL(currentScript.src, location.href);
      // e.g., /<repo>/js/tribute-loader.js  -> /<repo>/
      REPO_BASE = u.pathname.replace(/\/js\/[^/]+$/, "/");
    } catch(e){}
  }
  // 可手動覆寫（特殊部署路徑）
  if (typeof window.TRIBUTES_BASE === "string" && window.TRIBUTES_BASE) {
    REPO_BASE = window.TRIBUTES_BASE.replace(/\/?$/, "/");
  }
  log("REPO_BASE:", REPO_BASE);

  const $ = (id)=>document.getElementById(id);
  const resolve = (p)=>{
    if (!p) return p;
    if (/^https?:\/\//i.test(p)) return p;
    if (p.startsWith("/")) return p;
    return REPO_BASE + p.replace(/^\.?\//,"");
  };
  const INDEX_CANDIDATES = ["content/tributes/index.json","tributes/index.json"].map(resolve);
  const DEFAULT_DIR = resolve("content/tributes/");

  const escapeHtml = (s)=>String(s||"").replace(/[&<>"]/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m]));
  const joinMeta   = (parts)=>parts.filter(Boolean).join("｜");
  const getExcerpt = (it)=> it.excerpt || it.excrept || ""; // 兩種拼法皆支援

  // 將資源路徑補成以文章所在資料夾為基準
  function resolveAsset(src, assetBase){
    if (!src) return src;
    if (/^https?:\/\//i.test(src)) return src; // 絕對網址
    if (src.startsWith("/")) return src;       // 網域根
    return (assetBase || DEFAULT_DIR) + src.replace(/^\.?\//,'');
  }

  // 簡易 Markdown → HTML（支援標題/粗斜體/連結/清單/段落 + 圖片 + 圖片小標）
  function mdToHtml(md, assetBase){
    if (!md) return "";
    let h = md.replace(/\r\n?/g,"\n").trim();

    // 三引號 code block
    h = h.replace(/```([\s\S]*?)```/g, (_,code)=>`<pre class="bg-gray-100 p-3 rounded"><code>${escapeHtml(code)}</code></pre>`);

    // 標題
    h = h.replace(/^######\s?(.*)$/gm,"<h6>$1</h6>")
         .replace(/^#####\s?(.*)$/gm,"<h5>$1</h5>")
         .replace(/^####\s?(.*)$/gm,"<h4>$1</h4>")
         .replace(/^###\s?(.*)$/gm,"<h3>$1</h3>")
         .replace(/^##\s?(.*)$/gm,"<h2>$1</h2>")
         .replace(/^#\s?(.*)$/gm,"<h1>$1</h1>");

    // 圖片（有 title 就自動加 figcaption）：![alt](url "caption")
    h = h.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/g, (m, alt, src, title) => {
      const url = resolveAsset(src, assetBase);
      if (title) {
        return `
<figure class="my-6 text-center">
  <img src="${escapeHtml(url)}" alt="${escapeHtml(alt||"")}" class="mx-auto rounded-lg shadow max-w-full h-auto">
  <figcaption class="mt-2 text-sm text-gray-600">${escapeHtml(title)}</figcaption>
</figure>`;
      }
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt||"")}" class="mx-auto my-4 rounded-lg shadow max-w-full h-auto">`;
    });

    // 連結
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1</a>`);

    // 無序清單
    h = h.replace(/^(?:\s*[-*]\s+.*\n?)+/gm, block=>{
      const items = block.trim().split(/\n/).map(l=>l.replace(/^\s*[-*]\s+/,"")).map(it=>`<li>${it}</li>`).join("");
      return `<ul class="list-disc pl-6">${items}</ul>`;
    });

    // 段落（避免把 block/圖片再包 <p>）
	h = h.replace(/(?:^|\n)([^\n<][^\n]*)(?=\n|$)/g, (m, text) => {
	  if (/^\s*<\/?(h\d|ul|ol|li|pre|blockquote|img|figure|div|section|table|thead|tbody|tr|td)/i.test(text)) {
		return "\n" + text;
	  }
	  return "\n<p>" + text + "</p>";
	});

    // HTML <img> 的相對路徑也補上 & 預設樣式（若未自帶 class）
    h = h.replace(/<img([^>]*?)src="(?!https?:\/\/|\/)([^"]+)"([^>]*)>/g, (m, pre, src, post)=>{
      const hasClass = /class\s*=/.test(pre+post);
      const klass = hasClass ? "" : ` class="mx-auto my-4 rounded-lg shadow max-w-full h-auto"`;
      const url = resolveAsset(src, assetBase);
      return `<img${pre}src="${escapeHtml(url)}"${post}${klass}>`;
    });

    return h;
  }

  async function fetchJSON(url){
    log("fetch JSON:", url);
    const r = await fetch(url + (url.includes("?")?"":`?v=${Date.now()}`), {cache:"no-store"});
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  }
  async function fetchText(url){
    log("fetch TEXT:", url);
    const r = await fetch(url + (url.includes("?")?"":`?v=${Date.now()}`), {cache:"no-store"});
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.text();
  }

  let INDEX = [];
  const getSlug   = ()=> (location.hash||"").replace(/^#\/?/,"");
  const goToList  = ()=> { history.pushState(null,"",location.pathname+location.search); renderList(); };
  const goToSlug  = (slug)=> { location.hash = "#/"+slug; };

  function buildFilters(){
    const ySel = $("t-year");
    const tSel = $("t-tag");
    // 仍然支援有加回 date/tags 的情況；沒有就自動隱藏
    const years = Array.from(new Set(INDEX.map(it=>String(it.date||"").slice(0,4)).filter(Boolean))).sort((a,b)=>b.localeCompare(a));
    const tags  = Array.from(new Set(INDEX.flatMap(it=>it.tags||[]))).sort((a,b)=>a.localeCompare(b,'zh-Hant'));

    if (ySel) {
      ySel.innerHTML = `<option value="">全部年份</option>` + years.map(y=>`<option value="${y}">${y}</option>`).join("");
      const yWrap = ySel.closest("div") || ySel.parentElement;
      if (yWrap) yWrap.style.display = years.length ? "" : "none";
    }
    if (tSel) {
      tSel.innerHTML = `<option value="">全部標籤</option>` + tags.map(t=>`<option value="${t}">${t}</option>`).join("");
      const tWrap = tSel.closest("div") || tSel.parentElement;
      if (tWrap) tWrap.style.display = tags.length ? "" : "none";
    }
  }

  function renderList(){
    const list = $("t-list"), viewer = $("t-viewer");
    if (!list || !viewer) return;
    viewer.classList.add("hidden");
    list.classList.remove("hidden");

    const kw = ($("t-search")?.value || "").toLowerCase().trim();
    const yr = $("t-year")?.value || "";
    const tg = $("t-tag")?.value || "";

    const items = INDEX.filter(it=>{
      const okY = !yr || String(it.date||"").startsWith(yr);
      const okT = !tg || (it.tags||[]).includes(tg);
      const hay = (it.title + " " + (it.author||"") + " " + getExcerpt(it)).toLowerCase();
      const okK = !kw || hay.includes(kw);
      return okY && okT && okK;
    });

    list.innerHTML = items.map(it=>`
      <article class="section-card bg-white/85 rounded-2xl p-6 shadow hover:shadow-lg transition cursor-pointer"
               onclick="(function(){ window.openTribute && window.openTribute('${it.id}'); })()">
        <h3 class="text-xl font-semibold text-amber-900 mb-1">${escapeHtml(it.title)}</h3>
        <p class="text-sm text-gray-600 mb-2">${escapeHtml(joinMeta([
          it.author || "佚名",
          it.date || "",
          (it.tags && it.tags.length) ? it.tags.join("、") : ""
        ]))}</p>
        <p class="text-gray-700">${escapeHtml(getExcerpt(it))}</p>
      </article>
    `).join("") || `<div class="text-gray-600">目前沒有資料。</div>`;
  }

  async function renderArticle(slug){
    const list = $("t-list"), viewer = $("t-viewer");
    if (!list || !viewer) return;
    const item = INDEX.find(x=>x.id===slug);
    if (!item) { goToList(); return; }

    list.classList.add("hidden");
    viewer.classList.remove("hidden");
    $("t-title").textContent = item.title;
    $("t-meta").textContent  = joinMeta([
      item.author || "佚名",
      item.date || "",
      (item.tags && item.tags.length) ? item.tags.join("、") : ""
    ]);

    try {
      const filePath = item.file || (slug + ".md"); // 如果忘了填 file，也會用 id.md 嘗試
      const isAbs  = /^https?:\/\//i.test(filePath);
      const isRoot = filePath.startsWith("/");
      const url    = isAbs ? filePath : (isRoot ? filePath : DEFAULT_DIR + filePath);

      // 計算這篇文章的「資產基底路徑」：用來補 <img> 的相對路徑
      let assetBase = DEFAULT_DIR;
      if (!isAbs && !isRoot) {
        const dir = filePath.replace(/[^/]+$/, ""); // 取資料夾部分（含最後的 / 或變成空字串）
        assetBase = DEFAULT_DIR + dir;              // 若無子資料夾，dir 為 ""，等同 DEFAULT_DIR
      }

      const raw  = await fetchText(url);
      const isMD = /\.md($|\?)/i.test(filePath);
      $("t-content").innerHTML = isMD ? mdToHtml(raw, assetBase) : raw;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      log("rendered article from:", url, "assetBase:", assetBase);
    } catch (e) {
      $("t-content").innerHTML = `<div class="text-red-700">讀取文章失敗：${escapeHtml(String(e.message||e))}</div>`;
      warn("讀取文章失敗", e);
    }
  }

  async function boot(){
    // 讀 index（有 fallback）
    let idx=null, used=null, lastErr=null;
    for (const u of INDEX_CANDIDATES){
      try { idx = await fetchJSON(u); used=u; break; } catch(e){ lastErr=e; }
    }
    if (!idx) { warn("index.json 讀取失敗:", INDEX_CANDIDATES, lastErr); return; }

    INDEX = Array.isArray(idx) ? idx : [];
    // 排序：若有日期則新到舊，否則以標題；兩者並存時先比日期再比標題
    INDEX.sort((a,b)=>
      String(b.date||"").localeCompare(String(a.date||"")) ||
      String(a.title||"").localeCompare(String(b.title||""), 'zh-Hant')
    );

    buildFilters();
    renderList();

    $("t-search") && $("t-search").addEventListener("input", renderList);
    $("t-year")   && $("t-year").addEventListener("change", renderList);
    $("t-tag")    && $("t-tag").addEventListener("change", renderList);
    $("t-back")   && $("t-back").addEventListener("click", goToList);

    window.openTribute = (slug)=>{ goToSlug(slug); };

    // Hash 路由（可分享 #/id）
    window.addEventListener("hashchange", ()=>{
      const slug = getSlug();
      if (slug) renderArticle(slug); else renderList();
    });
    const init = getSlug();
    if (init) renderArticle(init);
  }

  if (document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
