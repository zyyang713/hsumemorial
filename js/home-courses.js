// js/home-courses.js  — 把 home.json 的 courses 渲染到首頁
(function () {
  const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

	function renderCourses(items) {
	  const list = document.getElementById('coursesList');
	  if (!list) return;
	  if (!Array.isArray(items) || !items.length) {
		list.innerHTML = `<div class="text-gray-600 text-center col-span-3">尚無課程資料</div>`;
		return;
	  }
	  const esc = (s) => String(s || "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
	  list.innerHTML = items.map(it => {
		const hasIcon = !!(it.icon && String(it.icon).trim());
		return `
		  <div class="section-card bg-white/80 rounded-xl p-8 shadow-lg text-center hover:shadow-xl transition-shadow">
			${hasIcon ? `
			<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
			  <span class="text-2xl">${esc(it.icon)}</span>
			</div>` : ``}
			<h4 class="text-xl font-semibold text-amber-800 mb-3">${esc(it.title || '')}</h4>
			<p class="text-gray-600 text-sm leading-relaxed">${esc(it.desc || '')}</p>
		  </div>
		`;
	  }).join('');
	}


  async function boot() {
    const onHome = /(^|\/)index\.html?$/.test(location.pathname) || location.pathname.endsWith('/') || location.pathname === '';
    if (!onHome) return;                       // 只在首頁跑
    try {
      const res = await fetch('content/home.json?v=' + Date.now(), { cache: 'no-store' });
      const data = await res.json();
      const courses = data.courses || data.strengths || [];  // strengths 作為相容備援
      const h = document.getElementById('coursesTitle');
      if (h) h.textContent = '教授課程';
      renderCourses(courses);
    } catch (e) {
      console.error('[home-courses] 載入失敗：', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
