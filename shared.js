// 各ページで言語の選び方と切り替えを共有する。文言は各ページの T に置く。
window.Site = (() => {
  const LANGS = ['zh', 'en', 'ja'];
  const KEY = 'yotenra.lang';

  function initial() {
    const explicit = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(explicit)) return explicit;
    try { const saved = localStorage.getItem(KEY); if (LANGS.includes(saved)) return saved; } catch (_) {}
    for (const l of navigator.languages || [navigator.language || '']) {
      const c = l.toLowerCase();
      if (c.startsWith('ja')) return 'ja';
      if (c.startsWith('zh')) return 'zh';
      if (c.startsWith('en')) return 'en';
    }
    return 'ja';
  }

  function mount(T, after) {
    const apply = lang => {
      const t = T[lang];
      document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
      if (t['meta.title']) {
        document.title = t['meta.title'];
        document.querySelector('meta[property="og:title"]')?.setAttribute('content', t['meta.title']);
      }
      if (t['meta.description']) {
        document.querySelector('meta[name="description"]')?.setAttribute('content', t['meta.description']);
        document.querySelector('meta[property="og:description"]')?.setAttribute('content', t['meta.description']);
      }
      document.querySelectorAll('[data-t]').forEach(el => {
        const v = t[el.dataset.t];
        if (v !== undefined) el.innerHTML = v;
      });
      document.querySelectorAll('.langbar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
      const url=new URL(location); url.searchParams.set('lang',lang); history.replaceState(null,'',url);
      if (after) after(lang, t);
      if(window.SiteNavigation) SiteNavigation.mount(lang);
      document.querySelectorAll('[data-home-shot]').forEach(img=>{img.src=`assets/shots/${img.dataset.homeShot}_${lang}.webp`;});
      document.querySelectorAll('a[href]').forEach(a=>{
        const u=new URL(a.getAttribute('href'),location);
        if(u.origin===location.origin && /(?:index|apps|work|challenge|resume)\.html$/.test(u.pathname)){u.searchParams.set('lang',lang);a.setAttribute('href',u.pathname.split('/').pop()+u.search+u.hash);}
      });
      try { localStorage.setItem(KEY, lang); } catch (_) { /* プライベートモードでは覚えない */ }
    };
    document.querySelector('.langbar')?.addEventListener('click', e => {
      const b = e.target.closest('[data-lang]');
      if (b) apply(b.dataset.lang);
    });
    apply(initial());
  }

  return { mount, initial };
})();
