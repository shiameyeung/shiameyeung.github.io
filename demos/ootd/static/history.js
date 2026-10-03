// 穿着记录：今天穿了什么、按日期的记录流水（可撤销）、补记以前某天。
(() => {
  const { $, esc, api, toast, state, views } = W;
  const SRC = { item: L.t('单件'), outfit: L.t('整套'), backfill: L.t('补记') };

  views.history = async main => {
    main.dataset.view = 'history';
    const [day, hist, all] = await Promise.all([api('GET', `/api/wear/day/${state.meta.today}`), api('GET', '/api/wear/history?limit=200'), api('GET', '/api/items')]);
    const groups = {}; hist.actions.forEach(a => (groups[a.wear_date] ||= []).push(a));
    main.innerHTML = L.html`<div class="heading"><div><h2>穿着记录</h2><div class="muted">同一件单品，同一天只计一次；单件和整套分别记录，撤销只影响那一次操作。</div></div></div>
      <div class="panel"><h3>今天 ${state.meta.today}</h3><div class="muted">已穿 ${day.items.length} 件</div>
        <div class="tags" style="margin-top:8px">${day.items.map(i => `<a class="tag" href="#/items/${i.id}">${i.code} ${esc(i.name)}</a>`).join('') || L.t('<span class="muted">还没有记录。在单品卡片上点「今天穿了」就会出现在这里。</span>')}</div></div>
      <details class="panel"><summary>补记以前某天穿了什么</summary>
        <form id="backfill" style="margin-top:8px"><div class="fields"><label class="field"><span>日期</span><input type="date" name="date" max="${state.meta.today}" required></label>
          <label class="field"><span>单品</span><select name="item_id" required>${all.items.map(i => `<option value="${i.id}">${i.code} ${esc(i.name)}</option>`).join('')}</select></label></div>
          <div class="actions" style="margin-top:8px"><button type="submit" class="primary">记录</button></div><div class="error" id="backfill-error"></div></form></details>
      ${Object.entries(groups).map(([d, acts]) => `<section class="panel"><h3>${d}</h3>${acts.map(a => `<div class="row"><div><div>${SRC[a.source] || a.source}${a.occasion ? ' · ' + esc(a.occasion) : ''}${a.undone_at ? L.t(' <span class="badge warn">已撤销</span>') : ''}</div>
          <div class="small">${a.items.map(it => `${it.code} ${esc(it.name)}${it.revoked_at ? L.t('（已单独撤销）') : ''}`).join('、')}</div></div>${a.undone_at ? '' : L.html`<button type="button" data-undo="${a.action_id}">撤销</button>`}</div>`).join('')}</section>`).join('') || L.t('<div class="empty">还没有穿着记录。</div>')}`;
    main.addEventListener('click', async e => {
      const b = e.target.closest('[data-undo]'); if (!b) return;
      try {
        const r = await api('POST', `/api/wear/actions/${b.dataset.undo}/undo`);
        toast(L.msg`已撤销；${r.lost_count_item_ids.length} 件次数减 1${r.still_counted_item_ids.length ? L.msg`，${r.still_counted_item_ids.length} 件因当天另有记录保持不变` : ''}。`);
        W.render();
      } catch (err) { toast(err.message, 6000); }
    });
    main.addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(e.target);
      try {
        const r = await api('POST', '/api/wear', { item_ids: [Number(fd.get('item_id'))], wear_date: fd.get('date'), source: 'backfill', idempotency_key: crypto.randomUUID() });
        toast(r.newly_counted.length ? L.t('已补记。') : L.t('那天已经记过这件了，次数不重复增加。')); W.render();
      } catch (err) { $('#backfill-error').textContent = err.message; }
    });
  };
})();
