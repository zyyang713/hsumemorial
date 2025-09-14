// js/site-shared.js
(function () {
  // 路由
  const routes = {
    home: 'index.html',
    biography: 'biography.html',
    papers: 'papers.html',
    presentations: 'presentation.html',
    tributes: 'tributes.html'
  };

  // 導頁
  window.navigateTo = function (page) {
    const url = routes[page] || 'index.html';
    location.href = url;
  };

  // 行動選單
  function bindMobileMenu() {
    const btn  = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    if (!btn || !menu || btn.dataset.bound) return;

    const toggle = (e) => {
      e && e.preventDefault();
      const hidden = menu.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!hidden));
      document.body.classList.toggle('overflow-hidden', !hidden);
    };

    btn.addEventListener('click', toggle);
    btn.addEventListener('touchend', toggle, { passive: true });

    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a) {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('overflow-hidden');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        menu.classList.add('hidden');
        btn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('overflow-hidden');
      }
    });

    btn.dataset.bound = '1';
  }

  // 淡入動畫
  function fadeInInit() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
  }

  // ── 新增：papers.html 依 hash 切換分頁（#personal / #supervised）
  function initPapersTabsFromHash() {
    const page = (location.pathname.split('/').pop() || '').toLowerCase();
    if (!page.includes('papers')) return;

    const btnPersonal = document.getElementById('tab-personal');
    const btnSupervised = document.getElementById('tab-supervised');
    const sectionPersonal = document.getElementById('personal-works');
    const sectionSupervised = document.getElementById('supervised-works');
    if (!btnPersonal || !btnSupervised || !sectionPersonal || !sectionSupervised) return;

    const switchTo = (who) => {
      const isPersonal = (who === 'personal');
      btnPersonal.classList.toggle('active', isPersonal);
      btnSupervised.classList.toggle('active', !isPersonal);
      sectionPersonal.classList.toggle('hidden', !isPersonal);
      sectionSupervised.classList.toggle('hidden', isPersonal);
    };

    // 初始依 hash 切
    const applyFromHash = () => {
      const h = (location.hash || '').replace('#', '');
      if (h === 'supervised') switchTo('supervised');
      else switchTo('personal'); // 預設個人著作
    };

    // 點按鈕時更新 hash（可直接分享連結）
    btnPersonal.addEventListener('click', () => {
      switchTo('personal');
      history.replaceState(null, '', '#personal');
    });
    btnSupervised.addEventListener('click', () => {
      switchTo('supervised');
      history.replaceState(null, '', '#supervised');
    });

    // 監聽 hash 變更（從首頁點連結或手動改 hash）
    window.addEventListener('hashchange', applyFromHash);

    // 首次進入執行一次
    applyFromHash();
  }
  // ── 新增結束 ──

  // 初次與 partials 載入後都綁定
  document.addEventListener('DOMContentLoaded', () => {
    bindMobileMenu();
    fadeInInit();
    initPapersTabsFromHash(); // ← 加在這裡
  });
  window.addEventListener('partials:loaded', () => {
    bindMobileMenu();
    initPapersTabsFromHash(); // ← 若 header 是 partial，載入後再執行一次保險
  });
})();
