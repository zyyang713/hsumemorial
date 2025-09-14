// js/home-achievements-links.js v1.4
(function () {
  const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const FALLBACK_HREF = {
    "學術論文與論著": "papers.html#personal",
    "演講":           "presentation.html",
    "指導碩博士生":   "papers.html#supervised",
    "教學生涯":       "biography.html#teaching"
  };
  const FALLBACK_ICON = {
    "學術論文與論著": "📄",
    "演講":           "🎤",
    "指導碩博士生":   "🎓",
    "教學生涯":       "🧑‍🏫"
  };

  function onHome() {
    const p = (location.pathname.split('/').pop() || '').toLowerCase();
    return !p || p === '' || p === 'index.html';
  }

  async function loadHome() {
    try {
      const r = await fetch('content/home.json?v=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return r.json();
    } catch {
      return { achievements: { stats: Object.keys(FALLBACK_HREF).map(k => ({ label: k })) } };
    }
  }

  function render(stats) {
    const grid = document.getElementById('achvStats') || document.getElementById('achvStatsGrid');
    if (!grid) return;

    // 先隱藏，避免舊渲染閃一下
    const prevVis = grid.style.visibility;
    grid.style.visibility = 'hidden';

    const items = Array.isArray(stats) ? stats : [];
    grid.innerHTML = items.map(it => {
      const label = it.label || '';
      const href  = it.href  || FALLBACK_HREF[label] || '#';
      const icon  = it.icon  || FALLBACK_ICON[label] || '⭐';
      return `
        <a href="${esc(href)}"
           class="block p-6 rounded-lg hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition text-center">
          <div class="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center shadow-inner">
            <span class="text-2xl">${esc(icon)}</span>
          </div>
          <h4 class="text-lg font-semibold text-amber-800">${esc(label)}</h4>
        </a>`;
    }).join('');

    // 完成後再顯示
    grid.style.visibility = prevVis || '';
  }

  async function boot() {
    if (!onHome()) return;
    const data = await loadHome();
    render(data?.achievements?.stats || []);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // 若 header 是 partial，載入後再跑一次保險
  window.addEventListener('partials:loaded', () => onHome() && boot());
})();
