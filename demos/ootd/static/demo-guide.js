// The guide only navigates the in-memory demo; it never records anything for the visitor.
(() => {
  if (!window.OOTD_DEMO) return;
  const steps=[
    {title:'找单品',purpose:'看清自己已经有什么，不靠记忆翻找衣物和彩妆。',how:'切换“衣橱 / 彩妆”，在搜索框输入名称、品牌或编号，也可以按分类筛选。点开一件查看它的资料、位置和使用次数。',route:'items',focus:'#q',highlight:'.filter-panel'},
    {title:'记录今天穿了什么',purpose:'把实际穿着变成记录，累计次数与每次成本会跟着更新。',how:'点选一件或几件，再点“记录今天穿了”。同一件同一天只计一次；点进已记录的单品，可以查看次数、费用并撤销今天的记录。',route:'today/apparel',focus:'.today-panel button[data-pick]',highlight:'.today-panel'},
    {title:'按搭配取衣',purpose:'把搭配和收纳位置连起来，选好一套就知道去哪里找每件。',how:'这里打开了一套示例搭配。“组成”显示单品，“取衣清单”按位置分组；可以打开单品查看详情，也可以点“今天穿了这套”一起记录。',route:'looks/1',focus:'#wear-outfit',highlight:'.two > section:nth-child(2)'}
  ];
  let panel,launcher,current=0,busy=false;
  const t=source=>window.L?.lang==='zh'?source:(window.OOTD_DEMO_CONTENT?.ui?.[source]?.[window.L?.lang]||source);
  function clearHighlight(){document.querySelectorAll('.demo-guide-target').forEach(el=>el.classList.remove('demo-guide-target'));}
  function draw(){
    const step=steps[current],esc=W.esc;
    panel.innerHTML=`<div class="demo-guide-head"><h2>${esc(t('用三步体验衣橱记录'))}</h2><button type="button" data-guide-close aria-label="${esc(t('关闭体验导览'))}">×</button></div>
      <p class="demo-guide-summary">${esc(t('OOTD 把衣物和彩妆整理成可查的档案：找单品、记录使用，再按搭配找到每件的位置。'))}</p>
      <nav class="demo-guide-steps" aria-label="${esc(t('体验导览'))}">${steps.map((s,n)=>`<button type="button" data-guide-step="${n}" ${n===current?'aria-current="step"':''}>${n+1}. ${esc(t(s.title))}</button>`).join('')}</nav>
      <div class="demo-guide-copy"><p><strong>${esc(t('用途'))}</strong>${esc(t(step.purpose))}</p><p><strong>${esc(t('怎么操作'))}</strong>${esc(t(step.how))}</p></div>
      <div class="demo-guide-controls"><button type="button" data-guide-prev ${current===0?'disabled':''}>${esc(t('上一项'))}</button><button type="button" class="primary" data-guide-focus>${esc(t('定位到操作区'))}</button><button type="button" data-guide-next>${esc(t(current===steps.length-1?'完成导览':'下一项'))}</button></div>
      <p class="demo-guide-foot">${esc(t('刷新或“恢复样例”可还原所有体验操作。'))}</p><p class="demo-guide-status" role="status" aria-live="polite"></p>`;
  }
  async function showStep(index){
    if(busy)return;
    current=index;draw();clearHighlight();busy=true;
    panel.querySelectorAll('button').forEach(button=>button.disabled=true);
    panel.querySelector('.demo-guide-status').textContent=t('正在打开操作区…');
    try{
      // replaceState avoids adding three tour-only entries to the browser's history.
      history.replaceState(null,'','#/'+steps[current].route);
      await W.render();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      if(panel.hidden)return;
      const target=document.querySelector(steps[current].highlight),focus=document.querySelector(steps[current].focus);
      if(!target||!focus)throw new Error('Demo controls unavailable');
      target.classList.add('demo-guide-target');
      const top=target.getBoundingClientRect().top+window.scrollY-panel.getBoundingClientRect().height-24;
      window.scrollTo({top:Math.max(0,top),behavior:'instant'});
      focus.focus({preventScroll:true});
      panel.querySelector('.demo-guide-status').textContent='';
    }catch(_){panel.querySelector('.demo-guide-status').textContent=t('操作区暂时不可用，可关闭导览后继续体验。');}
    finally{busy=false;panel.querySelectorAll('button').forEach(button=>button.disabled=button.hasAttribute('data-guide-prev')&&current===0);}
  }
  function close(){panel.hidden=true;clearHighlight();launcher.setAttribute('aria-expanded','false');launcher.focus();}
  function start(){
    if(panel)return;
    const banner=document.querySelector('.demo-banner');if(!banner)return;
    launcher=document.createElement('button');launcher.type='button';launcher.id='demo-guide-launch';launcher.textContent=t('体验导览');launcher.setAttribute('aria-label',t('打开体验导览'));launcher.setAttribute('aria-controls','demo-guide');launcher.setAttribute('aria-expanded','true');
    banner.querySelector('.actions').append(launcher);
    panel=document.createElement('aside');panel.id='demo-guide';panel.className='demo-guide';panel.setAttribute('aria-label',t('体验导览'));banner.after(panel);draw();
    launcher.addEventListener('click',()=>{panel.hidden=false;launcher.setAttribute('aria-expanded','true');panel.scrollIntoView({block:'start'});panel.querySelector('[data-guide-focus]').focus({preventScroll:true});});
    panel.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-guide-close'))return close();if(button.hasAttribute('data-guide-step'))return showStep(Number(button.dataset.guideStep));if(button.hasAttribute('data-guide-focus'))return showStep(current);if(button.hasAttribute('data-guide-prev'))return showStep(current-1);if(button.hasAttribute('data-guide-next'))return current===steps.length-1?close():showStep(current+1);});
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
  }
  window.OOTDDemoGuide={start};
})();
