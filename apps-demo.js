/* Small, local examples of the rules used by the actual apps. No API calls. */
const PortfolioMath = (() => {
  function scaledScore(pct, target=.7) {
    const pass=Math.round(target*1000), r=Math.max(0,Math.min(1,pct/100));
    return Math.round(r<=target?100+r/target*(pass-100):pass+(r-target)/(1-target)*(1000-pass));
  }
  function prediction(rates, target=.7) {
    const w=rates.map((_,i)=>.7**i), sum=w.reduce((a,b)=>a+b,0);
    const mean=rates.reduce((s,r,i)=>s+r*w[i],0)/sum;
    const sd=Math.sqrt(rates.reduce((s,r,i)=>s+(r-mean)**2*w[i],0)/sum);
    const margin=Math.max(3,sd)+(rates.length<3?6:rates.length<5?3:0);
    const lo=Math.max(0,mean-margin), hi=Math.min(100,mean+margin);
    const rest=rates.slice(1).reduce((s,r)=>s+r,0)/Math.max(1,rates.length-1), gap=rates[0]-rest;
    return {est:scaledScore(mean,target),lo:scaledScore(lo,target),hi:scaledScore(hi,target),pass:Math.round(target*1000),
      verdict:lo/100>=target?'safe':mean/100>=target?'likely':hi/100>=target?'risky':'low',
      trend:gap>3?'up':gap< -3?'down':'flat',conf:rates.length>=5?'high':rates.length>=3?'mid':'low'};
  }
  function language(exam, locale) {
    const ui=locale.startsWith('zh')?'zh':locale.startsWith('ja')?'ja':'en';
    const bank=exam==='AIF-C01'&&ui==='ja'?'en':ui; return {ui:bank,bank};
  }
  function calories(intake, previous, current, loss) {
    if(![intake,previous,current,loss].every(Number.isFinite)||intake<=0||previous<=0||current<=0||loss<0) return null;
    const correction=(previous-current)*4500/30, burn=intake+correction, deficit=loss*4500/30;
    const target=Math.round(burn-deficit);
    return target>0?{correction,burn,deficit,target}:null;
  }
  function size(under,bust) {
    if(!under||!bust||bust<=under) return {size:null,alternatives:[]};
    const cups=[['AAA',3.5,6],['AA',6.5,8.5],['A',9,11],['B',11.5,13.5],['C',14,16],['D',16.5,18.5],['E',19,21],['F',21.5,23.5],['G',24,26],['H',26.5,28.5],['I',29,31]];
    const difference=Math.round((bust-under)*10)/10;
    let cup=cups.find(x=>difference>=x[1]&&difference<=x[2])?.[0], alt;
    if(!cup){const i=cups.findIndex(x=>difference<x[1]);if(i>0){cup=cups[i-1][0];alt=cups[i][0];}}
    if(under<57.5||under>112.5||!cup)return {size:null,alternatives:[]};
    const lower=Math.ceil((under-2.5)/5)*5, band=Math.min(110,Math.max(60,lower));
    const bands=Math.abs(under-(lower+2.5))<.001&&band<110?[band+5]:[];
    return {size:`${band}${cup}`,alternatives:[...bands.map(x=>`${x}${cup}`),...(alt?[`${band}${alt}`,...bands.map(x=>`${x}${alt}`)]:[])]};
  }
  function wear(existing, selected) {return [...new Set([...existing,...selected])];}
  function cost(price, days) {return price===null||!Number.isFinite(price)||price<0?'noPrice':days<=0?'noWear':price/days;}
  return {scaledScore,prediction,language,calories,size,wear,cost};
})();
if(typeof module!=='undefined') module.exports=PortfolioMath;

const AppDemos = (() => {
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(s,vars)=>s.replace(/\{(\w+)\}/g,(_,k)=>esc(vars[k]??''));
  const names={zh:'中文',en:'English',ja:'日本語'};
  function number(id,label,value,step=1,min=0,max=10000) {return `<label>${label}<input id="${id}" type="number" value="${value}" step="${step}" min="${min}" max="${max}" inputmode="decimal"></label>`;}
  function check(id,label,on=true) {return `<label class="check"><input type="checkbox" id="${id}" ${on?'checked':''}>${label}</label>`;}
  function tile(app,n,t,body) {return `<article class="demo" id="${app}-d${n}"><span class="demo-tag">${t['demo.example']} · ${String(n).padStart(2,'0')}</span><h4>${t[`${app}.demo.d${n}.t`]}</h4><p class="demo-hint">${t[`${app}.demo.d${n}.h`]}</p>${body}<button class="reset" type="button" data-reset="${app}">${t['demo.reset']}</button></article>`;}
  function html(app,t) {
    if(app==='aws')return [
      `<label>${t['demo.exam']}<select id="aws-exam"><option>AIF-C01</option><option>SAA-C03</option></select></label><fieldset class="locale-buttons"><legend>${t['demo.browser']}</legend>${['zh-CN','ja-JP','en-US','fr-FR'].map((x,i)=>`<button type="button" data-locale="${x}" aria-pressed="${i===0}">${x}</button>`).join('')}</fieldset><output id="aws-language" aria-live="polite"></output>`,
      `<div class="sliders">${[85,89,66].map((v,i)=>`<label>${t[['demo.latest','demo.older','demo.oldest'][i]]}<input id="aws-rate${i}" type="range" min="0" max="100" value="${v}"><span id="aws-pct${i}">${v}%</span></label>`).join('')}</div><output id="aws-prediction" aria-live="polite"></output>`,
      `<p class="term-sample">${['s3','gateway','lifecycle'].map(x=>`<span class="term-wrap"><button class="term" type="button" aria-describedby="tip-${x}">${t[`aws.demo.term.${x}`]}</button><span role="tooltip" class="tip" id="tip-${x}">${t[`aws.demo.tip.${x}`]}</span></span>`).join(' · ')}</p><p>${t['aws.demo.d3.text']}</p>`,
      `<p>${t['aws.demo.question']}</p><ol type="A">${['A','B','C','D'].map(x=>`<li>${t[`aws.demo.option${x}`]}</li>`).join('')}</ol>${check('aws-answered',t['demo.answer'],false)}<button type="button" id="aws-copy">${t['demo.copy']}</button><output id="aws-copy-status" aria-live="polite"></output><pre id="aws-markdown" tabindex="0"></pre>`
    ].map((b,i)=>tile(app,i+1,t,b)).join('');
    if(app==='cal')return [
      `<div class="fields">${[1926,65.01,65.26,2].map((v,i)=>number(`cal-value${i}`,t[`cal.demo.d1.in${i+1}`],v,i===0?1:.01,0)).join('')}</div><output id="cal-result" aria-live="polite"></output>`,
      `<div class="food-buttons">${[['rice',224],['egg',70],['yogurt',120],['cake',180],['chicken',250]].map(([f,k])=>`<button type="button" data-food="${k}">${t[`demo.food.${f}`]} <small>${k} kcal</small></button>`).join('')}</div><div class="intake-meter"><span></span></div><output id="cal-food" aria-live="polite"></output><button class="secondary" type="button" id="cal-clear">${t['demo.clear']}</button>`,
      ['complete','current','previous'].map(x=>check('cal-have-'+x,t['demo.'+x])).join('')+`<output id="cal-eligible" aria-live="polite"></output>`,
      `<div class="fields">${[['band',75],['bust',90],['waist',65],['hip',95],['height',170]].map(([k,v])=>number('cal-'+k,t['demo.'+k],v,.1,1,250)).join('')}</div><output id="cal-body" aria-live="polite"></output>`
    ].map((b,i)=>tile(app,i+1,t,b)).join('');
    if(app==='ootd')return [
      `<div class="item-picks">${Array.from({length:6},(_,i)=>`<button type="button" data-item="${i+1}" aria-pressed="false"><span class="clothing-photo photo-${i+1}" aria-hidden="true"></span><span>${t[`demo.item.${i+1}`]}</span></button>`).join('')}</div><output id="ootd-picked" aria-live="polite"></output><button type="button" id="ootd-record">${t['ootd.demo.d1.record']}</button><output id="ootd-today" aria-live="polite"></output>`,
      number('ootd-price',t['demo.price'],300,.01)+`<button type="button" id="ootd-wear">${t['ootd.demo.d2.wear']}</button><output id="ootd-cost" aria-live="polite"></output>`,
      `<div class="storage-grid">${[5,3,4,6,11,16,14,15,20].map((n,i)=>`<button type="button" data-cell="${i}" aria-pressed="${i===0}">A${Math.floor(i/3)+1}${i%3+1}<span>${n}</span></button>`).join('')}</div><output id="ootd-place" aria-live="polite"></output><button type="button" id="ootd-remove">${t['ootd.demo.d3.takeOut']}</button><output id="ootd-unplaced" aria-live="polite"></output>`,
      check('ootd-never',t['demo.never'],false)+`<label>${t['demo.sort']}<select id="ootd-sort"><option value="newest">${t['demo.newest']}</option><option value="worn">${t['demo.worn']}</option></select></label><ul id="ootd-list" class="mini-list"></ul>`
    ].map((b,i)=>tile(app,i+1,t,b)).join('');
    return '';
  }
  function bind(app,t) {
    const $=id=>document.getElementById(id);
    const on=(id,type,fn)=>$(id).addEventListener(type,fn);
    const out=(id,s)=>{$(id).textContent=s;};
    const val=id=>$(id).value.trim()===''?NaN:Number($(id).value);
    document.querySelectorAll(`[data-reset="${app}"]`).forEach(b=>b.onclick=()=>{
      const host=$(`demos-${app}`);host.innerHTML=html(app,t);bind(app,t);
    });
    if(app==='aws'){
      let locale='zh-CN';
      const language=()=>{const r=PortfolioMath.language($('aws-exam').value,locale);out('aws-language',fmt(t['aws.demo.d1.r'],{lang:locale,ui:names[r.ui],bank:names[r.bank]}));};
      document.querySelectorAll('[data-locale]').forEach(b=>b.onclick=()=>{locale=b.dataset.locale;document.querySelectorAll('[data-locale]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));language();});
      on('aws-exam','change',language);language();
      const predict=()=>{const rates=[0,1,2].map(i=>val('aws-rate'+i));rates.forEach((v,i)=>out('aws-pct'+i,v+'%'));const r=PortfolioMath.prediction(rates);out('aws-prediction',fmt(t['aws.demo.d2.r'],{...r,verdict:t['aws.demo.verdict.'+r.verdict],trend:t['aws.demo.trend.'+r.trend],conf:t['aws.demo.conf.'+r.conf]}));};
      [0,1,2].forEach(i=>on('aws-rate'+i,'input',predict));predict();
      document.querySelectorAll('.term').forEach(b=>b.onclick=()=>b.closest('.term-wrap').classList.toggle('open'));
      const markdown=()=>{const answered=$('aws-answered').checked;out('aws-markdown',t['aws.demo.prompt']+'\n\n## '+t['aws.demo.mark.stem']+'\n'+t['aws.demo.question']+'\n\n## '+t['aws.demo.mark.options']+'\n'+['A','B','C','D'].map(x=>x+'. '+t['aws.demo.option'+x]).join('\n')+(answered?'\n\n## '+t['aws.demo.mark.answer']+'\nA. Amazon S3\n\n## '+t['aws.demo.mark.explanation']+'\n'+t['aws.demo.explanation']:''));out('aws-copy-status','');};
      on('aws-answered','change',markdown);markdown();
      $('aws-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('aws-markdown').textContent);out('aws-copy-status',t['demo.copied']);}catch{out('aws-copy-status',t['demo.copyFallback']);$('aws-markdown').focus();}};
    }
    if(app==='cal'){
      let total=0;
      const target=()=>PortfolioMath.calories(...[0,1,2,3].map(i=>val('cal-value'+i)));
      const food=()=>{const n=target()?.target??1589;out('cal-food',`${t['demo.target']}: ${n} kcal · ${t['demo.intake']}: ${total} kcal · ${total<=n?t['demo.remaining']+': '+(n-total)+' kcal':fmt(t['cal.demo.d2.over'],{n:total-n})}`);document.querySelector('.intake-meter span').style.width=Math.min(100,total/n*100)+'%';};
      const eligible=()=>{const days=$('cal-have-complete').checked, weights=$('cal-have-current').checked&&$('cal-have-previous').checked;out('cal-eligible',!days?t['cal.demo.d3.reason.days']:!weights?t['cal.demo.d3.reason.weight']:target()?t['cal.demo.d3.ready']+' · '+target().target+' kcal':t['demo.invalid']);};
      const calc=()=>{const r=target();out('cal-result',r?fmt(t['cal.demo.d1.steps'],Object.fromEntries(Object.entries(r).map(([k,v])=>[k,k==='target'?v:v.toFixed(1)]))):t['demo.invalid']);food();eligible();};
      [0,1,2,3].forEach(i=>on('cal-value'+i,'input',calc));['complete','current','previous'].forEach(x=>on('cal-have-'+x,'change',eligible));calc();
      document.querySelectorAll('[data-food]').forEach(b=>b.onclick=()=>{total+=Number(b.dataset.food);food();});$('cal-clear').onclick=()=>{total=0;food();};
      const body=()=>{const [under,bust,waist,hip,height]=['band','bust','waist','hip','height'].map(k=>val('cal-'+k));const r=PortfolioMath.size(under,bust);out('cal-body',`${t['demo.size']}: ${r.size||'—'}${r.alternatives.length?' · '+fmt(t['cal.demo.d4.boundary'],{sizes:r.alternatives.join(' / ')}):''} · ${t['demo.ratioWH']}: ${waist>0&&hip>0?(waist/hip).toFixed(2):'—'} · ${t['demo.ratioHeight']}: ${waist>0&&height>0?(waist/height).toFixed(2):'—'}`);};
      ['band','bust','waist','hip','height'].forEach(x=>on('cal-'+x,'input',body));body();
    }
    if(app==='ootd'){
      let chosen=[], recorded=[], days=0,cell=0,unplaced=0,counts=[5,3,4,6,11,16,14,15,20];
      const picked=()=>out('ootd-picked',fmt(t['ootd.demo.d1.picked'],{n:chosen.length}));
      document.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.item);chosen=chosen.includes(i)?chosen.filter(x=>x!==i):[...chosen,i];b.setAttribute('aria-pressed',String(chosen.includes(i)));picked();});picked();
      $('ootd-record').onclick=()=>{const next=PortfolioMath.wear(recorded,chosen),same=next.length===recorded.length&&chosen.length>0;recorded=next;out('ootd-today',fmt(t['ootd.demo.d1.done'],{n:recorded.length})+(same?' · '+t['ootd.demo.d1.already']:''));};
      const cost=()=>{const r=PortfolioMath.cost($('ootd-price').value.trim()===''?null:val('ootd-price'),days);out('ootd-cost',typeof r==='number'?fmt(t['ootd.demo.d2.result'],{n:days,cost:r.toFixed(2)}):t['ootd.demo.d2.'+r]);};
      on('ootd-price','input',cost);$('ootd-wear').onclick=()=>{days++;cost();};cost();
      const place=()=>{out('ootd-place',fmt(t['ootd.demo.d3.placed'],{cell:`A${Math.floor(cell/3)+1}${cell%3+1}`,n:counts[cell]})+' · '+t['ootd.demo.d3.size']);out('ootd-unplaced',fmt(t['ootd.demo.d3.unplaced'],{n:unplaced}));$('ootd-remove').disabled=counts[cell]===0;document.querySelectorAll('[data-cell]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.cell)===cell));b.querySelector('span').textContent=counts[b.dataset.cell];});};
      document.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{cell=Number(b.dataset.cell);place();});$('ootd-remove').onclick=()=>{if(counts[cell]>0){counts[cell]--;unplaced++;}place();};place();
      const wears=[0,0,1,3,0,5,0,2], list=()=>{let a=wears.map((n,i)=>({n,id:i+1}));if($('ootd-never').checked)a=a.filter(x=>x.n===0);a.sort($('ootd-sort').value==='worn'?(a,b)=>b.n-a.n||b.id-a.id:(a,b)=>b.id-a.id);$('ootd-list').innerHTML=a.map(x=>`<li><span>${t['demo.item.'+x.id]}</span><small>${fmt(t['ootd.demo.d4.wornTimes'],{n:x.n})}</small></li>`).join('');};
      on('ootd-never','change',list);on('ootd-sort','change',list);list();
    }
  }
  return {html,bind};
})();
