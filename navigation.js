/* Shared navigation keeps every page's context and next step visible. */
window.SiteNavigation = (() => {
  const labels = {
  "zh": {
    "nav.contact": "联系我",
    "nav.home": "首页",
    "nav.projects": "项目",
    "nav.work": "工作实践",
    "nav.resume": "简历",
    "nav.overview": "项目总览",
    "nav.read": "查看项目",
    "nav.next": "继续了解",
    "nav.all": "所有项目",
    "nav.top": "回到顶部",
    "nav.menu": "浏览网站",
    "nav.close": "收起导航",
    "nav.chapters": "本页章节",
    "nav.related": "相关页面",
    "story.tools": "自己每天在用的工具",
    "story.work": "把同样的思路，用到真实业务",
    "story.research": "在研究里，继续拆解问题",
    "story.next": "接下来，我想做什么",
    "nav.features": "功能",
    "nav.demo": "试用演示",
    "nav.screens": "实际界面",
    "nav.design": "设计思路",
    "chapter.summary": "概要",
    "chapter.context": "业务与职责",
    "chapter.workflow": "工作流",
    "chapter.records": "记录与复用",
    "chapter.tasks": "任务拆解",
    "chapter.dashboard": "作业工作台",
    "chapter.repair": "修正与源头改善",
    "chapter.tradeoffs": "困难与取舍",
    "chapter.results": "成果",
    "chapter.approach": "工作方式",
    "chapter.references": "参考资料",
    "chapter.research": "研究与探索"
  },
  "ja": {
    "nav.contact": "連絡する",
    "nav.home": "ホーム",
    "nav.projects": "プロジェクト",
    "nav.work": "仕事での取り組み",
    "nav.resume": "職務経歴書",
    "nav.overview": "プロジェクト一覧",
    "nav.read": "詳しく見る",
    "nav.next": "次のプロジェクトへ",
    "nav.all": "すべてのプロジェクト",
    "nav.top": "ページの先頭へ",
    "nav.menu": "メニュー",
    "nav.close": "メニューを閉じる",
    "nav.chapters": "このページの目次",
    "nav.related": "関連ページ",
    "story.tools": "毎日使っているツール",
    "story.work": "同じ考え方を、仕事にも",
    "story.research": "研究でも、問題を整理する",
    "story.next": "これから取り組みたいこと",
    "nav.features": "機能",
    "nav.demo": "操作デモ",
    "nav.screens": "実際の画面",
    "nav.design": "設計の考え方",
    "chapter.summary": "概要",
    "chapter.context": "業務と役割",
    "chapter.workflow": "仕事の流れ",
    "chapter.records": "記録と再利用",
    "chapter.tasks": "タスク分解",
    "chapter.dashboard": "作業ダッシュボード",
    "chapter.repair": "修正と根本的な改善",
    "chapter.tradeoffs": "課題と取捨選択",
    "chapter.results": "成果",
    "chapter.approach": "仕事の進め方",
    "chapter.references": "参考資料",
    "chapter.research": "研究・探究"
  },
  "en": {
    "nav.contact": "Contact me",
    "nav.home": "Home",
    "nav.projects": "Projects",
    "nav.work": "Work",
    "nav.resume": "Resume",
    "nav.overview": "Project overview",
    "nav.read": "View project",
    "nav.next": "Next project",
    "nav.all": "All projects",
    "nav.top": "Back to top",
    "nav.menu": "Menu",
    "nav.close": "Close menu",
    "nav.chapters": "On this page",
    "nav.related": "Related pages",
    "story.tools": "Tools I use every day",
    "story.work": "Applying the same approach at work",
    "story.research": "Working through research questions",
    "story.next": "What I want to work on next",
    "nav.features": "Features",
    "nav.demo": "Interactive demos",
    "nav.screens": "Screenshots",
    "nav.design": "Design decisions",
    "chapter.summary": "Overview",
    "chapter.context": "Role & duties",
    "chapter.workflow": "Workflow",
    "chapter.records": "Notes & reuse",
    "chapter.tasks": "Task breakdown",
    "chapter.dashboard": "Work dashboard",
    "chapter.repair": "Fixes & improvements",
    "chapter.tradeoffs": "Challenges & trade-offs",
    "chapter.results": "Results",
    "chapter.approach": "How I work",
    "chapter.references": "References",
    "chapter.research": "Research & exploration"
  }
};
  const label = (lang, key) => labels[lang]?.[key];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const link = (href, text, current = false) => `<a href="${escape(href)}"${current ? ' aria-current="page"' : ''}>${escape(text)}</a>`;
  const desktop = matchMedia('(min-width: 1280px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let language = 'ja', sections = [], signature = '', scrollFrame = 0, refreshFrame = 0, watching = false;

  const icons = {
    top: '<path d="m5 10 7-7 7 7M12 3v18"/>',
    tools: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    work: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 13h18M10 13v3h4v-3"/>',
    research: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="7" r="3"/><circle cx="12" cy="18" r="3"/><path d="m9 6 6 1M7.5 9l3 6M16.5 10l-3 5"/>',
    next: '<path d="M3 12h18m-7-7 7 7-7 7"/>',
    demo: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m10 8 6 4-6 4Z"/>',
    screens: '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    design: '<path d="m4 20 4-1 12-12-3-3L5 16Z M14 7l3 3"/>',
    section: '<path d="M5 5h14M5 12h14M5 19h9"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.section}</svg>`;

  function headingText(heading) {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"],.section-number').forEach(node => node.remove());
    return copy.textContent.replace(/\s+/g, ' ').trim();
  }

  // New sections need only a real h2. Explicit labels also cover an opening summary.
  function collectSections() {
    const used = new Set();
    return [...document.querySelectorAll('.wrap h2,.wrap [data-rail-label]')].flatMap((heading, index) => {
      if (heading.closest('a,nav,footer,.facts,.resume-card,[data-rail-exclude],[hidden]')) return [];
      if (!heading.closest('main,section') && !heading.hasAttribute('data-rail-label')) return [];
      const text = heading.dataset.railLabel || headingText(heading);
      if (!text || /^\d+$/.test(text)) return [];
      const parent = heading.closest('section');
      const target = heading.hasAttribute('data-rail-label') ? heading : parent?.querySelector('h2') === heading ? parent : heading;
      if (used.has(target)) return [];
      used.add(target);
      if (!target.id) {
        const stem = 'chapter-' + String(heading.dataset.t || heading.dataset.nav || index + 1).replace(/[^a-z0-9-]/gi, '-');
        let id = stem, suffix = 2;
        while (document.getElementById(id)) id = stem + '-' + suffix++;
        target.id = id;
      }
      const hint = heading.dataset.railIcon || heading.dataset.nav || target.id;
      const kind = Object.keys(icons).find(key => hint.includes(key)) || (hint.includes('daily') ? 'tools' : hint.includes('method') ? 'design' : 'section');
      target.classList.add('section-anchor');
      return [{target, text, short: labels[language][heading.dataset.railKey] || text, kind}];
    });
  }

  function syncHeaderHeight() {
    const header = document.getElementById('site-header');
    if (header) document.documentElement.style.setProperty('--nav-height', `${Math.ceil(header.getBoundingClientRect().height)}px`);
  }

  function updateCurrent() {
    scrollFrame = 0;
    const rail = document.getElementById('page-outline');
    if (!rail) return;
    const line = (document.getElementById('site-header')?.getBoundingClientRect().bottom || 0) + (desktop.matches ? 32 : 92);
    let current = null;
    sections.forEach(item => { if (item.target.getBoundingClientRect().top <= line) current = item; });
    if (scrollY > 0 && innerHeight + scrollY >= document.documentElement.scrollHeight - 8) current = sections.at(-1);
    const id = current?.target.id || 'page-top';
    rail.querySelectorAll('a[data-target]').forEach(anchor => {
      if (anchor.dataset.target === id) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
    rail.querySelector('.outline-current').textContent = current?.short || labels[language]['nav.top'];
  }

  function onScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateCurrent);
  }

  function scrollToTarget(id, focus = false, smooth = false) {
    const target = id === 'page-top' ? document.getElementById('site-header') : document.getElementById(id);
    if (!target) return;
    if (id === 'page-top') window.scrollTo({top: 0, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto'});
    else target.scrollIntoView({block: 'start', behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto'});
    if (focus) {
      const focusTarget = target.querySelector('h2') || target;
      if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({preventScroll: true});
    }
    onScroll();
  }

  function refresh() {
    refreshFrame = 0;
    sections = collectSections();
    document.documentElement.classList.toggle('has-outline', sections.length >= 3);
    const nextSignature = JSON.stringify([language, sections.map(item => [item.target.id, item.text, item.short, item.kind])]);
    if (nextSignature === signature) { onScroll(); return; }
    signature = nextSignature;
    let rail = document.getElementById('page-outline');
    if (sections.length < 3) { rail?.remove(); return; }
    if (!rail) {
      rail = document.createElement('nav');
      rail.id = 'page-outline';
      rail.className = 'section-rail';
      const pageHead = document.querySelector('.page-head,.card-me');
      pageHead.after(rail);
      rail.addEventListener('click', event => {
        const anchor = event.target.closest('a[data-target]');
        if (!anchor || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const hash = '#' + encodeURIComponent(anchor.dataset.target);
        if (location.hash !== hash) history.pushState(null, '', hash);
        if (!desktop.matches) rail.querySelector('details').open = false;
        scrollToTarget(anchor.dataset.target, true, true);
      });
    }
    const t = labels[language];
    rail.setAttribute('aria-label', t['nav.chapters']);
    rail.innerHTML = `<details${desktop.matches ? ' open' : ''}><summary><span>${escape(t['nav.chapters'])}</span><span class="outline-current"></span></summary><ul class="outline-list">${sections.map(item => `<li><a href="#${encodeURIComponent(item.target.id)}" data-target="${escape(item.target.id)}" title="${escape(item.text)}">${icon(item.kind)}<span>${escape(item.short)}</span></a></li>`).join('')}</ul><a class="outline-top" href="#page-top" data-target="page-top">${icon('top')}<span>${escape(t['nav.top'])}</span></a></details>`;
    updateCurrent();
  }

  function queueRefresh() {
    if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh);
  }

  function watchContent() {
    if (watching) return;
    watching = true;
    addEventListener('scroll', onScroll, {passive: true});
    addEventListener('resize', () => { syncHeaderHeight(); onScroll(); }, {passive: true});
    desktop.addEventListener('change', () => {
      const details = document.querySelector('#page-outline details');
      if (details) details.open = desktop.matches;
    });
    addEventListener('hashchange', () => {
      try { scrollToTarget(decodeURIComponent(location.hash.slice(1))); } catch (_) {}
    });
    const observer = new MutationObserver(records => {
      if (records.some(record => !(record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest('#page-outline,#page-navigation,#reading-next'))) queueRefresh();
    });
    observer.observe(document.querySelector('.wrap'), {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'data-rail-label', 'data-rail-key']});
    if (window.ResizeObserver) new ResizeObserver(syncHeaderHeight).observe(document.getElementById('site-header'));
    addEventListener('load', () => {
      syncHeaderHeight();
      try { scrollToTarget(decodeURIComponent(location.hash.slice(1))); } catch (_) {}
    }, {once: true});
  }

  function mount(lang) {
    language = labels[lang] ? lang : 'ja';
    const t = labels[language], page = location.pathname.split('/').pop() || 'index.html';
    const projects = typeof APPS !== 'undefined' ? APPS.map(app => app.id) : ['aws', 'cal', 'ootd', 'corp', 'sna'];
    const titles = {aws: 'AWS Pass It', cal: 'CalTracker', ootd: 'OOTD', corp: 'CorpLink-AI', sna: language === 'zh' ? 'OSS 依赖分析' : language === 'ja' ? 'OSS依存関係分析' : 'OSS dependency analysis'};
    const project = new URLSearchParams(location.search).get('project');
    const selected = projects.includes(project) ? project : null;
    const section = page === 'challenge.html' ? 'work.html' : page;
    const pageTitle = document.querySelector('.page-head h1')?.textContent || t['nav.projects'];
    if (selected) titles[selected] = pageTitle;
    let header = document.getElementById('site-header');
    if (!header) { header = document.createElement('header'); header.id = 'site-header'; header.className = 'site-header'; document.body.prepend(header); }
    const langbar = document.querySelector('.langbar');
    const focusedLanguageButton = langbar?.contains(document.activeElement) ? document.activeElement : null;
    header.innerHTML = `<div class="site-header-inner"><a class="site-brand" href="index.html">YO TENRA</a><nav class="site-nav" aria-label="${t['nav.menu']}">${[['index.html', 'nav.home'], ['apps.html', 'nav.projects'], ['work.html', 'nav.work'], ['resume.html', 'nav.resume']].map(([href, key]) => link(href, t[key], section === href)).join('')}</nav><div class="language-slot"></div></div>`;
    if (langbar) header.querySelector('.language-slot').append(langbar);
    focusedLanguageButton?.focus({preventScroll: true});
    document.querySelectorAll('[data-nav]').forEach(element => { if (t[element.dataset.nav]) element.textContent = t[element.dataset.nav]; });
    document.querySelectorAll('.back').forEach(element => { element.hidden = true; });
    let local = document.getElementById('page-navigation');
    if (page !== 'index.html') {
      if (!local) { local = document.createElement('div'); local.id = 'page-navigation'; local.className = 'page-navigation'; document.querySelector('.page-head').before(local); }
      const parent = selected ? link('apps.html', t['nav.projects']) : page === 'challenge.html' ? link('work.html', t['nav.work']) : '';
      local.innerHTML = `<nav class="breadcrumbs" aria-label="${t['nav.menu']}">${link('index.html', t['nav.home'])}<span aria-hidden="true">/</span>${parent ? parent + '<span aria-hidden="true">/</span>' : ''}<span aria-current="page">${escape(pageTitle)}</span></nav>`;
    }
    const challengeTitle = language === 'zh' ? '最难的开发经验' : language === 'ja' ? '最も難しかった開発経験' : 'Toughest development project';
    const nextId = projects[(projects.indexOf(selected) + 1) % projects.length];
    const targets = selected ? [['apps.html?project=' + nextId, t['nav.next'] + ' · ' + (titles[nextId] || nextId)], ['apps.html', t['nav.all']]] : page === 'work.html' ? [['challenge.html', challengeTitle], ['apps.html', t['nav.projects']]] : page === 'resume.html' ? [['challenge.html', challengeTitle], ['apps.html', t['nav.projects']]] : page === 'apps.html' ? [['work.html', t['nav.work']], ['challenge.html', challengeTitle]] : [['work.html', t['nav.work']], ['apps.html', t['nav.projects']]];
    if (page !== 'index.html') {
      let next = document.getElementById('reading-next');
      if (!next) { next = document.createElement('nav'); next.id = 'reading-next'; next.className = 'reading-next'; document.querySelector('footer').before(next); }
      next.setAttribute('aria-label', t['nav.related']);
      next.innerHTML = `<span class="related-title">${escape(t['nav.related'])}</span>` + targets.map(([href, text]) => link(href, text + ' →')).join('') + link('mailto:1@yotenra.com', t['nav.contact'] + ' · 1@yotenra.com');
    }
    syncHeaderHeight();
    refresh();
    watchContent();
    requestAnimationFrame(() => {
      syncHeaderHeight();
      try { scrollToTarget(decodeURIComponent(location.hash.slice(1))); } catch (_) {}
    });
  }
  return {mount, label, refresh: queueRefresh};
})();
