/* Shared navigation keeps every page's context and next step visible. */
window.SiteNavigation = (() => {
  const labels = {
  "zh": {
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
    "story.tools": "自己每天在用的工具",
    "story.work": "把同样的思路，用到真实业务",
    "story.research": "在研究里，继续拆解问题",
    "story.next": "接下来，我想做什么",
    "nav.features": "功能",
    "nav.demo": "试用演示",
    "nav.screens": "实际界面",
    "nav.design": "设计思路"
  },
  "ja": {
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
    "story.tools": "毎日使っているツール",
    "story.work": "同じ考え方を、仕事にも",
    "story.research": "研究でも、問題を整理する",
    "story.next": "これから取り組みたいこと",
    "nav.features": "機能",
    "nav.demo": "操作デモ",
    "nav.screens": "実際の画面",
    "nav.design": "設計の考え方"
  },
  "en": {
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
    "story.tools": "Tools I use every day",
    "story.work": "Applying the same approach at work",
    "story.research": "Working through research questions",
    "story.next": "What I want to work on next",
    "nav.features": "Features",
    "nav.demo": "Interactive demos",
    "nav.screens": "Screenshots",
    "nav.design": "Design decisions"
  }
};
  const label=(lang,key)=>labels[lang][key];
  const link=(href,text,current=false)=>`<a href="${href}"${current?' aria-current="page"':''}>${text}</a>`;
  function mount(lang) {
    const t=labels[lang], page=location.pathname.split('/').pop()||'index.html';
    const projects=['aws','cal','ootd','corp','sna'];
    const titles={aws:'AWS Pass It',cal:'CalTracker',ootd:'OOTD',corp:'CorpLink-AI',sna:lang==='zh'?'OSS 依赖分析':lang==='ja'?'OSS依存関係分析':'OSS dependency analysis'};
    const project=new URLSearchParams(location.search).get('project');
    const selected=projects.includes(project)?project:null;
    const section=page==='challenge.html'?'work.html':page;
    let header=document.getElementById('site-header');
    if(!header){header=document.createElement('header');header.id='site-header';header.className='site-header';document.body.prepend(header);}
    const language=document.querySelector('.langbar');
    header.innerHTML=`<div class="site-header-inner"><a class="site-brand" href="index.html">YO TENRA</a><nav class="site-nav" aria-label="${t['nav.menu']}">${[['index.html','nav.home'],['apps.html','nav.projects'],['work.html','nav.work'],['resume.html','nav.resume']].map(([href,key])=>link(href,t[key],section===href)).join('')}</nav><div class="language-slot"></div></div>`;
    if(language)header.querySelector('.language-slot').append(language);
    document.querySelectorAll('[data-nav]').forEach(el=>{if(t[el.dataset.nav])el.textContent=t[el.dataset.nav];});
    document.querySelectorAll('.back').forEach(el=>el.hidden=true);
    let local=document.getElementById('page-navigation');
    if(page!=='index.html'){
      if(!local){local=document.createElement('div');local.id='page-navigation';local.className='page-navigation';document.querySelector('.page-head').before(local);}
      const crumb=`${link('index.html',t['nav.home'])}<span aria-hidden="true">/</span>${selected?link('apps.html',t['nav.projects'])+'<span aria-hidden="true">/</span><b>'+titles[selected]+'</b>':link(section,t[section==='apps.html'?'nav.projects':section==='resume.html'?'nav.resume':'nav.work'])}`;
      const links=page==='apps.html'?(selected&&['aws','cal','ootd'].includes(selected)?[['#project-features','nav.features'],['#project-demo','nav.demo'],['#project-screens','nav.screens'],['#project-design','nav.design']]:projects.map(id=>['apps.html?project='+id,titles[id]])):page==='work.html'||page==='challenge.html'?[['work.html',t['nav.work']],['challenge.html',lang==='zh'?'最难的开发经验':lang==='ja'?'最も難しかった開発経験':'Toughest development project']]:[];
      local.innerHTML=`<nav class="breadcrumbs" aria-label="${t['nav.menu']}">${crumb}</nav><nav class="section-nav">${links.map(([href,key])=>link(href,t[key]||key,href===page)).join('')}</nav>`;
      if(selected){local.querySelector('.breadcrumbs').insertAdjacentHTML('beforeend',link('apps.html', '← '+t['nav.all']));}
    }
    let next=document.getElementById('reading-next');
    if(page!=='index.html'){
      if(!next){next=document.createElement('nav');next.id='reading-next';next.className='reading-next';document.querySelector('footer').before(next);}
      const targets=selected?[['apps.html?project='+projects[(projects.indexOf(selected)+1)%projects.length],t['nav.next']+' · '+titles[projects[(projects.indexOf(selected)+1)%projects.length]]],['apps.html',t['nav.all']]]:page==='work.html'?[['challenge.html',lang==='zh'?'最难的开发经验':lang==='ja'?'最も難しかった開発経験':'Toughest development project'],['apps.html',t['nav.projects']]]:page==='challenge.html'?[['work.html',t['nav.work']],['resume.html',t['nav.resume']]]:[['work.html',t['nav.work']],['resume.html',t['nav.resume']]];
      if(page==='resume.html')targets[1]=['apps.html',t['nav.projects']];
      next.innerHTML=targets.map(([href,text])=>link(href,text+' →')).join('')+link('#',t['nav.top']+' ↑');
    }
  }
  return {mount,label};
})();

