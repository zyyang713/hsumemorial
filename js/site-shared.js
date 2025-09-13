// js/site-shared.js
(function () {
  const routes = {
    home: 'index.html',
    biography: 'biography.html',
    papers: 'papers.html',
    presentations: 'presentation.html',
	tributes: 'tributes.html' 
  };

  window.navigateTo = function (page) {
    const url = routes[page] || 'index.html';
    location.href = url;
  };

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

  function fadeInInit(){
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.15 });
    document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
  }

  // 初次與 partials 載入後都綁定
  document.addEventListener('DOMContentLoaded', () => { bindMobileMenu(); fadeInInit(); });
  window.addEventListener('partials:loaded', () => { bindMobileMenu(); });
})();