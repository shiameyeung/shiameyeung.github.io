// 记「今天穿了」：几百件衣服靠翻是翻不到的，这里直接把最可能的几件摆出来，勾上一次记完。
(() => {
  const { $, $$, esc, api, toast, icon, views } = W;
  const KIND_KEY = 'ootd.collection-kind';
  let picked = new Set();

  function savedKind() {
    try { return !window.OOTD_DEMO && localStorage.getItem(KIND_KEY) === 'cosmetics' ? 'cosmetics' : 'apparel'; } catch (_) { return 'apparel'; }
  }

  function card(i, on) {
    const photo = i.photos.find(p => p.role === 'product') || i.photos[0];
    return `<button type="button" class="today-pick ${on ? 'on' : ''}" data-pick="${i.id}" aria-pressed="${on}" title="${esc(i.display_name || i.name)}">
      <span class="today-photo">${photo ? `<img src="${esc(photo.url)}" alt="" loading="lazy">` : icon('wardrobe')}${on ? `<span class="today-check">${icon('check')}</span>` : ''}</span>
      <span class="today-name">${esc(i.display_name || i.name)}</span></button>`;
  }

  function wornRow(i, verb) {
    const photo = i.photos.find(p => p.role === 'product') || i.photos[0];
    return L.html`<a class="today-worn-item" href="#/items/${i.id}">
      <span class="today-worn-photo">${photo ? `<img src="${esc(photo.url)}" alt="" loading="lazy">` : icon('wardrobe')}</span>
      <span class="today-worn-name">${esc(i.display_name || i.name)}<small>${esc(i.code)} · ${L.t(i.category.main_code === 'COS' ? '今天用了' : '今天穿了')}</small></span></a>`;
  }

  views.today = async (main, kind) => {
    main.dataset.view = 'today';
    kind = ['apparel', 'cosmetics'].includes(kind) ? kind : savedKind();
    picked = new Set();
    const data = await api('GET', `/api/wear/suggestions?kind=${kind}`);
    if (!main.isConnected) return;
    const verb = kind === 'cosmetics' ? L.t('用了') : L.t('穿了');
    const noun = kind === 'cosmetics' ? L.t('彩妆') : L.t('衣物');
    const groups = [
      {key:'recent', title:kind === 'cosmetics' ? L.t('最近用过') : L.t('最近穿过'), hint:L.t('常用的排在前面')},
      {key:'seasonal', title:data.season ? L.msg`当季（${L.meta(data.season)}）还没穿过` : L.t('还没用过'), hint:L.t('按最近买的排')},
    ].filter(g => data[g.key].length);

    main.innerHTML = L.html`<div class="heading"><div><div class="eyebrow">${data.today}</div><h2>${L.t(kind === 'cosmetics' ? '今天用了什么' : '今天穿了什么')}</h2>
        <p class="muted">点一下选中，选好一起记。同一件同一天只算一次，重复点不会多加。</p></div>
        <nav class="attention-kind" aria-label="记录范围"><a href="#/today/apparel" ${kind === 'apparel' ? 'aria-current="page"' : ''}>衣橱</a><a href="#/today/cosmetics" ${kind === 'cosmetics' ? 'aria-current="page"' : ''}>彩妆</a></nav></div>

      <section class="today-panel">
        ${groups.length ? groups.map(g => `<div class="today-group"><div class="today-group-head"><strong>${g.title}</strong><span class="small">${g.hint}</span></div>
          <div class="today-row">${data[g.key].map(i => card(i, false)).join('')}</div></div>`).join('')
          : L.html`<div class="attention-empty">${icon('check')}<h3>这一类都记过了</h3><p class="muted">想记别的，去单品列表里搜一件。</p><a href="#/items">打开${noun}列表</a></div>`}
        <div class="today-bar" hidden><span id="today-count"></span>
          <button type="button" class="primary" id="today-save">${L.t(kind === 'cosmetics' ? '记录今天用了' : '记录今天穿了')}</button>
          <button type="button" id="today-clear">取消</button></div>
      </section>

      <section class="panel today-done-panel">
        <div class="heading"><div><h3>今天已经记下的<span class="badge">${data.worn_today.length} 件</span></h3>
          <p class="muted">${data.worn_today.length ? L.t('点进去可以撤销这一天的记录。') : L.t('还没有记录。选好上面的单品，或者在列表里找。')}</p></div>
          <div class="actions"><a class="button" href="#/history">看穿着记录</a></div></div>
        ${data.worn_today.length ? `<div class="today-worn">${data.worn_today.map(i => wornRow(i, verb)).join('')}</div>` : ''}
      </section>`;

    const bar = $('.today-bar', main);
    const refresh = () => {
      bar.hidden = !picked.size;
      $('#today-count', main).textContent = L.msg`已选 ${picked.size} 件`;
      $$('[data-pick]', main).forEach(b => {
        const on = picked.has(Number(b.dataset.pick));
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    main.onclick = async event => {
      const pick = event.target.closest('[data-pick]');
      if (pick) {
        const id = Number(pick.dataset.pick);
        picked.has(id) ? picked.delete(id) : picked.add(id);
        return refresh();
      }
      if (event.target.closest('#today-clear')) { picked.clear(); return refresh(); }
      const save = event.target.closest('#today-save');
      if (!save) return;
      save.disabled = true;
      try {
        // 一次提交整组，服务端按同一个动作记，撤销时也能整组撤
        const r = await api('POST', '/api/wear', {item_ids:[...picked], source: picked.size > 1 ? 'outfit' : 'item', idempotency_key: crypto.randomUUID()});
        toast(r.newly_counted.length ? L.msg`记好了，${r.newly_counted.length} 件的次数加 1。` : L.t('这几件今天已经记过，次数不重复加。'));
        picked.clear();
        await views.today(main, kind);
      } catch (error) { save.disabled = false; toast(error.message, 6000); }
    };
  };
})();
