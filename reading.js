/* Progressive reading keeps the approved full text beside its overview. */
window.SiteReading = (() => {
  const state = new Map();
  let language = 'ja';
  const label = key => window.SiteNavigation?.label(language, key) || key;
  function remember() {
    document.querySelectorAll('details.reading-detail[id]').forEach(d => state.set(d.id, d.open));
  }
  document.addEventListener('toggle', event => {
    const d = event.target;
    if (d.matches?.('details.reading-detail[id]')) state.set(d.id, d.open);
  }, true);
  let printState = null;
  window.addEventListener('beforeprint', () => {
    printState = new Map([...document.querySelectorAll('details.reading-detail')].map(d => [d.id, d.open]));
    document.querySelectorAll('details.reading-detail').forEach(d => { d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!printState) return;
    document.querySelectorAll('details.reading-detail').forEach(d => { d.open = printState.get(d.id) === true; state.set(d.id, d.open); });
    printState = null;
  });
  function detail(id, heading, nodes) {
    const d = document.createElement('details');
    d.id = id; d.className = 'reading-detail';
    d.open = state.get(id) === true;
    const s = document.createElement('summary');
    s.append(heading); d.append(s);
    const body = document.createElement('div'); body.className = 'reading-detail-body';
    nodes.forEach(n => body.append(n)); d.append(body);
    return d;
  }
  function heading(key, level = 'h2') {
    const h = document.createElement(level); h.dataset.nav = key; h.textContent = label(key); return h;
  }
  function foldSection(section, id) {
    if (!section || section.querySelector(':scope > .reading-detail')) return;
    const h = section.querySelector(':scope > h2,:scope > h3,:scope > .job-head');
    if (!h) return;
    const nodes = [...section.childNodes].filter(n => n !== h);
    section.append(detail(id, h, nodes));
  }
  function gallery(element, key) {
    if (!element) return;
    element.classList.add('reading-gallery'); element.tabIndex = 0;
    element.setAttribute('role', 'group'); element.setAttribute('aria-label', label(key));
  }
  function home() {
    const work = document.getElementById('work-practice');
    const tools = document.getElementById('daily-tools');
    if (work && tools && work.previousElementSibling !== document.querySelector('.introduction')) tools.before(work);
    if (work && !document.getElementById('work-context-detail')) {
      const copy = work.querySelector(':scope > p[data-t="work.desc"]');
      const notes = [...work.querySelectorAll(':scope > .stat-note')];
      if (copy) work.querySelector('.stat-grid').after(detail('work-context-detail', heading('chapter.context'), [copy, ...notes]));
    }
    foldSection(document.getElementById('working-principle'), 'principle-detail');
    const about = document.getElementById('about-me');
    if (about && !about.querySelector(':scope > .reading-detail')) {
      const h = about.querySelector('.mascot-heading');
      if (h) about.append(detail('about-detail', h, [...about.childNodes].filter(n => n !== h)));
    }
    gallery(document.querySelector('.everyday-grid'), 'story.tools');
  }
  function work() {
    document.querySelectorAll('#jobs > .job').forEach(s => foldSection(s, s.id + '-detail'));
    const jobs = document.getElementById('jobs');
    if (jobs && !jobs.querySelector(':scope > h2')) {
      jobs.classList.add('reading-chapter'); jobs.prepend(heading('chapter.approach'));
    }
    ['holly', 'studio'].forEach(id => {
      document.querySelectorAll('#' + id + ' .case-part').forEach((s, i) => {
        if (i > 0 && !['holly-role', 'studio-results'].includes(s.id)) foldSection(s, s.id + '-detail');
      });
    });
    const studioResults = document.getElementById('studio-results');
    const studioContext = document.getElementById('studio-context');
    if (studioResults && studioContext) studioContext.after(studioResults);
    foldSection(document.getElementById('work-method'), 'work-method-detail');
  }
  function apps() {
    gallery(document.querySelector('.project-overview-grid:not(.research-grid)'), 'story.tools');
    const app = document.querySelector('.app');
    if (!app) return;
    [...app.querySelectorAll(':scope > h2.app-section-heading')].forEach(h => {
      if (!['project-features', 'project-design', 'project-screens'].includes(h.id)) return;
      const nodes = []; let n = h.nextSibling;
      while (n && !(n.nodeType === 1 && n.matches('h2.app-section-heading'))) { nodes.push(n); n = n.nextSibling; }
      const id = h.id;
      if (id === 'project-screens') {
        const shots = nodes.find(x => x.nodeType === 1 && x.matches('.shots'));
        const first = shots?.firstElementChild;
        if (first) { const preview = document.createElement('div'); preview.className = 'representative-shot shots'; preview.append(first); h.before(preview); }
      }
      const marker = document.createComment('reading ' + id); h.before(marker);
      const d = detail(app.id + '-' + id + '-detail', h, nodes); marker.replaceWith(d);
    });
    gallery(app.querySelector('.scenes'), 'chapter.approach');
  }
  function challenge(t) {
    const summary = document.getElementById('summary');
    if (summary && !document.getElementById('challenge-results-detail')) {
      const more = summary.querySelector('[data-t="tldr.more"]');
      if (more) summary.append(detail('challenge-results-detail', heading('chapter.results'), [more]));
    }
    const result = document.querySelector('#s8 .case-figure');
    if (result && !document.getElementById('challenge-key-results')) {
      result.id = 'challenge-key-results'; result.classList.add('reading-evidence');
      document.getElementById('featured-case').before(result);
    }
    const feature = document.getElementById('featured-case');
    if (feature && !document.getElementById('featured-decision-detail')) {
      const extra = [...feature.children].filter(n => n.matches('p') && !n.classList.contains('feature-result')).slice(1);
      const figure = feature.querySelector('figure');
      if (extra.length || figure) feature.append(detail('featured-decision-detail', heading('chapter.tradeoffs'), [...extra, ...(figure ? [figure] : [])]));
    }
    const facts = document.getElementById('facts');
    if (facts && !facts.closest('details')) {
      const d = detail('challenge-context-detail', heading('chapter.context'), [facts]);
      document.getElementById('full-process').prepend(d);
    }
    document.querySelectorAll('#article > .case-section[id]').forEach(s => foldSection(s, s.id + '-detail'));
  }
  function mount(lang, t) {
    language = lang;
    const page = location.pathname.split('/').pop() || 'index.html';
    if (page === 'index.html') home();
    if (page === 'work.html') work();
    if (page === 'apps.html') apps();
    if (page === 'challenge.html') challenge(t);
    document.querySelectorAll('details.reading-detail[id]').forEach(d => {
      if (state.has(d.id)) d.open = state.get(d.id);
    });
  }
  function reveal(target) {
    if (!target) return;
    if (target.matches?.('details.reading-detail')) target.open = true;
    target.querySelector?.(':scope > details.reading-detail')?.setAttribute('open', '');
    let parent = target.parentElement;
    while (parent) { if (parent.matches('details')) parent.open = true; parent = parent.parentElement; }
  }
  return {mount, remember, reveal};
})();
