// Translate source-owned UI fragments before inserting interpolated user data.
// Stable codes, tag.value, names, notes, URLs, and form values keep their originals.
window.L = (() => {
  const supported=['zh','en','ja'];
  const query=new URLSearchParams(location.search).get('lang');
  const browser=(navigator.language||'zh').slice(0,2);
  const lang=query!==null?(supported.includes(query)?query:'zh'):(supported.includes(browser)?browser:'zh');
  const locale={zh:'zh-CN',en:'en-US',ja:'ja-JP'}[lang];
  document.documentElement.lang=locale;
  const index=lang==='en'?0:1;
  const meta=s => lang==='zh'?String(s??''):(window.OOTD_META_TRANSLATIONS?.[s]?.[index]||String(s??''));
  const practicalChinese={
    '让每一件喜欢，都有出场机会':'记录单品、搭配与使用情况',
    '重遇那些已经拥有的喜欢。':'查看已有单品，保存和调整搭配。',
    '先放进喜欢的单品，慢慢搭成一套。':'添加单品，组合并保存搭配。',
    '随便逛逛':'随机排序',
    '翻翻搭配本':'查看搭配',
    '一点点整理':'整理资料'
  };
  const translate=s => lang==='zh'?(practicalChinese[s]||s):(window.OOTD_UI_TRANSLATIONS?.[s]?.[index]||window.OOTD_META_TRANSLATIONS?.[s]?.[index]||s);
  function chunk(source) {
    const match=source.match(/^(\s*)([\s\S]*?)(\s*)$/);const core=match[2];
    return match[1]+translate(core)+match[3];
  }
  function htmlSource(source) {
    // Only text nodes and display-only attributes in the source template.
    // Interpolation placeholders stay opaque until after these translations.
    source=source.replace(/(^|>)([^<>]*)(?=<|$)/g,(all,prefix,text)=>prefix+chunk(text));
    return source.replace(/\b(aria-label|placeholder|title|alt|label)=("([^"]*)"|'([^']*)')/g,(all,key,quoted,double,single)=>key+'="'+chunk(double??single)+'"');
  }
  const inject=(source,values)=>source.replace(/\{(\d+)\}/g,(m,n)=>String(values[Number(n)]??''));
  const sourceOf=strings=>strings.reduce((s,part,n)=>s+(n?'{'+(n-1)+'}':'')+part,'');
  const t=s => String(s).includes('<')?htmlSource(String(s)):chunk(String(s));
  const msg=(strings,...values)=>inject(chunk(sourceOf(strings)),values);
  const html=(strings,...values)=>inject(htmlSource(sourceOf(strings)),values);
  function change(next) {const url=new URL(location.href);url.searchParams.set('lang',supported.includes(next)?next:'zh');location.assign(url.href);}
  function picker() {
    const select=document.createElement('select');select.className='language-picker';select.setAttribute('aria-label',t('界面语言'));
    [['zh','中文'],['en','English'],['ja','日本語']].forEach(([code,label])=>{const o=document.createElement('option');o.value=code;o.textContent=label;o.selected=code===lang;select.append(o);});
    select.addEventListener('change',()=>change(select.value));return select;
  }
  return {lang,locale,t,msg,html,meta,change,picker};
})();
