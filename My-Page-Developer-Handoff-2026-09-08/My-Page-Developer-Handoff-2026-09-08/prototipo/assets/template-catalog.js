window.MYPAGE_TEMPLATES=[
 {id:'01',name:'Immersive',description:'Hero panorâmico · escuro',colors:['#101724','#f4f7fb','#55d5ee']},
 {id:'02',name:'Editorial',description:'Retrato dividido · editorial',colors:['#f4f0e8','#201e1b','#b83d18']},
 {id:'03',name:'Raw',description:'Tipografia forte · recortes',colors:['#eeeae1','#171714','#b82c1b']},
 {id:'04',name:'Ember',description:'Laranja · composição assimétrica',colors:['#200d05','#fff6e6','#ff751f']},
 {id:'05',name:'Portrait',description:'Fotografia imersiva · grelha',colors:['#390d18','#fff4ef','#ffabb8']}
];
window.renderTemplateCatalog=(host,onSelect,current)=>{
 host.classList.add('template-catalog');
 for(const t of window.MYPAGE_TEMPLATES){const card=document.createElement('article');card.className='template-choice';card.dataset.template=t.id;
 const frame=document.createElement('div');frame.className='template-frame';const iframe=document.createElement('iframe');iframe.src='dj-template-'+t.id+'.html';iframe.title='Pré-visualização do template '+t.name;iframe.loading='lazy';iframe.setAttribute('sandbox','');iframe.tabIndex=-1;frame.append(iframe);card.append(frame);
 const observer=new ResizeObserver(()=>{iframe.style.transform='scale('+frame.clientWidth/1200+')';});observer.observe(frame);
 const title=document.createElement('h4');title.textContent=t.id+' · '+t.name;card.append(title);const p=document.createElement('p');p.textContent=t.description;card.append(p);
 const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Escolher '+t.name;b.setAttribute('aria-pressed',String(t.id===current));b.onclick=()=>onSelect(t.id);card.append(b);
 const a=document.createElement('a');a.href='dj-template-'+t.id+'.html';a.target='_blank';a.rel='noopener';a.textContent='Ver em tamanho real ↗';card.append(a);host.append(card);}
};
window.chooseMyPageTemplate=id=>{try{const t=window.MYPAGE_TEMPLATES.find(t=>t.id===id);if(!t)return;const key='mypage-studio-v2-draft',draft=JSON.parse(localStorage.getItem(key)||'{}')||{};draft.version=2;draft.fields={...draft.fields,template:id,background:t.colors[0],text_color:t.colors[1],accent:t.colors[2]};localStorage.setItem(key,JSON.stringify(draft));location.href='backoffice.html#editor';}catch{alert('Não foi possível guardar a escolha neste navegador.');}};
