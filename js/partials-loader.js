// js/partials-loader.js  — 以 data-include 引入 HTML partial
(function(){
  const currentScript = document.currentScript;
  let base = "/";
  try {
    const u = new URL(currentScript.src, location.href);
    base = u.pathname.replace(/\/js\/[^/]+$/, "/");
  } catch(e){}

  function resolve(p){
    if (!p) return p;
    if (/^https?:\/\//.test(p)) return p;
    if (p.startsWith("/")) return p;
    return base + p.replace(/^\.?\//, "");
  }

  async function includePartials(root=document){
    const nodes = Array.from(root.querySelectorAll("[data-include]"));
    const cache = {};
    await Promise.all(nodes.map(async node => {
      const path = node.getAttribute("data-include");
      const url = resolve(path);
      let html = cache[url];
      if (!html) {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) { console.warn("include 失敗：", url, res.status); return; }
        html = await res.text();
        cache[url] = html;
      }
      // 以外層替換（避免多一層無語義包裹）
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      node.replaceWith(frag);
    }));
    window.dispatchEvent(new CustomEvent("partials:loaded"));
  }

  document.addEventListener("DOMContentLoaded", () => includePartials());
  window.includePartials = includePartials; // 若有需要可手動再呼叫
})();
