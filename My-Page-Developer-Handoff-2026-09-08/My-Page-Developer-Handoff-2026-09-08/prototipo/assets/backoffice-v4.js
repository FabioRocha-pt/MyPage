(() => {
  const page=document.getElementById('page'), mainPanel=document.querySelector('[data-tool-panel="editor"]');
  document.querySelector('.tool-tabs').remove();
  mainPanel.querySelector('.layout-manager').remove();
  mainPanel.querySelector('.notice').remove();
  const submenu=document.createElement('div');submenu.className='mypage-submenu';submenu.hidden=page.hidden;
  const menus=[['editor','Page'],['booking','Booking'],['events','Eventos'],['donations','Donativos'],['store','Merchandising']];
  for(const [id,label] of menus){const b=document.createElement('button');b.type='button';b.dataset.tool=id;b.textContent=label;if(id!=='editor'){const small=document.createElement('small');small.textContent='Brevemente';b.append(small);}submenu.append(b);}
  document.querySelector('.sidebar nav').append(submenu);
  const definitions=[{id:'biography',dom:'basic',name:'Informações básicas'},{id:'visual',dom:'visual',name:'Imagens e cores',configuration:true},{id:'press',dom:'press',name:'Press kit'},{id:'music',dom:'music',name:'Músicas e sets'},{id:'video',dom:'video',name:'Vídeos'},{id:'booking',name:'Booking'},{id:'events',name:'Eventos · Muska'},{id:'donations',name:'Donativos',soon:true},{id:'store',name:'Merchandising',soon:true}];
  const list=document.createElement('div');list.className='page-sections';mainPanel.prepend(list);
  const status=document.createElement('p');status.className='hint';status.setAttribute('role','status');mainPanel.append(status);
  mainPanel.append(document.getElementById('request'));document.querySelector('[data-tool-panel="request"]').remove();
  const copy={booking:'Define se o Booking aparece na tua página. O calendário e a receção de pedidos terão gestão no menu Booking; a ligação ainda está pendente.',events:'Os eventos serão recebidos do Muska. Aqui defines apenas a visibilidade e a posição; cartazes, informação e bilhetes são geridos no Muska Link.',donations:'Brevemente. Os donativos permanecem ocultos até a ferramenta estar disponível.',store:'Brevemente. A loja de merchandising permanece oculta até a ferramenta estar disponível.'};
  const rows=new Map();
  for(const d of definitions){
    let card;
    if(d.dom)card=document.getElementById(d.dom);else{
      card=document.createElement('details');card.className='accordion';card.id='page-'+d.id;
      const summary=document.createElement('summary');summary.innerHTML='<span class="section-icon"></span><span><b></b><small></small></span><span class="chevron">⌄</span>';
      summary.querySelector('b').textContent=d.name;summary.querySelector('small').textContent=d.soon?'Brevemente':'Visibilidade e posição na página';card.append(summary);
      const body=document.createElement('div');body.className='section-body';const p=document.createElement('p');p.textContent=copy[d.id];body.append(p);
      const b=document.createElement('button');b.type='button';b.className='secondary';b.textContent='Ver gestão de '+d.name;b.addEventListener('click',()=>window.selectMyPageTool(d.id));body.append(b);card.append(body);
    }
    const row=document.createElement('div');row.className='editor-section';row.dataset.sectionId=d.id;row.append(card);
    const controls=document.createElement('div');controls.className='section-controls';
    if(!d.configuration){const label=document.createElement('label');label.className='visibility';const check=document.createElement('input');check.type='checkbox';check.disabled=!!d.soon;check.setAttribute('aria-label','Mostrar '+d.name+' na página');label.append(check,document.createTextNode(d.soon?'Brevemente':'Visível'));controls.append(label);check.addEventListener('change',()=>{order.find(x=>x.id===d.id).visible=check.checked;label.lastChild.textContent=check.checked?'Visível':'Oculta';announce('Visibilidade atualizada.');});}
    else{const note=document.createElement('small');note.textContent='Aparência';note.title='Configuração visual, não é uma secção pública';controls.append(note);}
    for(const [action,offset,icon] of [['up',-1,'↑'],['down',1,'↓']]){const b=document.createElement('button');b.type='button';b.textContent=icon;b.dataset.move=action;b.setAttribute('aria-label',(offset<0?'Subir ':'Descer ')+d.name);b.addEventListener('click',()=>{const i=order.findIndex(x=>x.id===d.id),target=i+offset;if(target<0||target>=order.length)return;[order[i],order[target]]=[order[target],order[i]];render();announce(d.name+' movida para a posição '+(target+1)+'.');(b.disabled?controls.querySelector('button:not(:disabled)'):b)?.focus();});controls.append(b);}
    row.append(controls);rows.set(d.id,row);
  }
  ['press','music','video'].forEach(id=>document.querySelector('[data-tool-panel="'+id+'"]').remove());
  let saved=[];try{saved=JSON.parse(localStorage.getItem('mypage-studio-v2-draft')||'{}')?.layout||[];}catch{}
  const seen=new Set(),byId=new Map(definitions.map(d=>[d.id,d]));let order=[];
  if(Array.isArray(saved))for(const entry of saved){if(entry&&byId.has(entry.id)&&!seen.has(entry.id)){const d=byId.get(entry.id);order.push({...d,visible:d.soon?false:entry.visible!==false});seen.add(entry.id);}}
  for(const d of definitions)if(!seen.has(d.id)){if(d.id==='visual'&&order.length)order.splice(Math.min(1,order.length),0,{...d,visible:true});else order.push({...d,visible:!d.soon});}
  window.getMyPageLayout=()=>order.map(({id,visible})=>({id,visible}));
  function announce(message){status.textContent=message+' Clica em Atualizar página para guardar o rascunho local.';}
  function render(){order.forEach((d,i)=>{const row=rows.get(d.id);list.append(row);row.querySelector('.section-icon').textContent=String(i+1).padStart(2,'0');row.querySelector('[data-move="up"]').disabled=i===0;row.querySelector('[data-move="down"]').disabled=i===order.length-1;const check=row.querySelector('.visibility input');if(check){check.checked=d.visible;check.parentElement.lastChild.textContent=d.soon?'Brevemente':d.visible?'Visível':'Oculta';}});}
  render();
  window.selectMyPageTool=id=>{
    if(['press','music','video','request'].includes(id))id='editor';
    document.querySelectorAll('[data-tool-panel]').forEach(p=>p.hidden=p.dataset.toolPanel!==id);
    submenu.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===id);b.setAttribute('aria-current',b.dataset.tool===id?'page':'false');});
    page.querySelector('.view-head h2').textContent=id==='editor'?'Faz dela a tua página.':menus.find(m=>m[0]===id)?.[1]||'My Page';
    page.querySelector('.view-head p').textContent=id==='editor'?'Abre cada cartão para escolher o conteúdo. Usa as setas no próprio cartão para mudar a ordem.':'Área de gestão da ferramenta. Disponível numa próxima fase.';
    document.querySelector('.page-actions').hidden=id!=='editor';
  };
  submenu.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>window.selectMyPageTool(b.dataset.tool)));
  document.querySelectorAll('[data-view="page"]').forEach(b=>b.addEventListener('click',()=>window.selectMyPageTool('editor')));
  new MutationObserver(()=>submenu.hidden=page.hidden).observe(page,{attributes:true,attributeFilter:['hidden']});
  const actions=document.createElement('div');actions.className='page-actions';
  const actionNote=document.createElement('p');actionNote.textContent='Atualizar guarda localmente. O preview mostra o template de demonstração. A publicação ainda não está ligada.';actions.append(actionNote);
  const buttons=document.createElement('div');const save=document.getElementById('save'),preview=document.getElementById('preview');save.type='button';preview.type='button';save.textContent='Atualizar página';preview.textContent='Preview ↗';buttons.append(save,preview);
  const publish=document.createElement('button');publish.type='button';publish.className='primary';publish.textContent='Publicar';publish.addEventListener('click',()=>{publishInfo.hidden=false;publishInfo.focus();});buttons.append(publish);actions.append(buttons);
  const publishInfo=document.createElement('p');publishInfo.hidden=true;publishInfo.tabIndex=-1;publishInfo.className='notice';publishInfo.setAttribute('role','status');publishInfo.textContent='Publicação ainda indisponível. É necessário ligar o servidor, validar o endereço e integrar os templates. Nenhuma página foi publicada.';actions.append(publishInfo);mainPanel.append(actions);
  window.selectMyPageTool('editor');
  document.querySelectorAll('.notice').forEach(n=>{
    n.querySelector('.status-dot')?.remove();
    if(!n.querySelector('.warning-icon')){const icon=document.createElement('span');icon.className='warning-icon';icon.textContent='⚠';icon.setAttribute('aria-hidden','true');n.prepend(icon);}
    if(!n.querySelector('.dismiss-note')){const b=document.createElement('button');b.type='button';b.className='dismiss-note';b.textContent='×';b.setAttribute('aria-label','Fechar nota');n.append(b);}
    n.querySelector('.dismiss-note').addEventListener('click',()=>n.hidden=true);
  });
})();
