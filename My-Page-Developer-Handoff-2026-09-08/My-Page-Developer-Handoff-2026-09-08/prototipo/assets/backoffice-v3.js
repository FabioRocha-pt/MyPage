(() => {
  window.selectMyPageTool = id => {
    const valid=[...document.querySelectorAll('[data-tool-panel]')].some(p=>p.dataset.toolPanel===id);
    if(!valid)return;
    document.querySelectorAll('[data-tool-panel]').forEach(p=>p.hidden=p.dataset.toolPanel!==id);
    document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===id);b.setAttribute('aria-pressed',String(b.dataset.tool===id));});
  };
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>window.selectMyPageTool(b.dataset.tool)));
  document.querySelectorAll('.notice').forEach(n=>{
    n.querySelector('.status-dot')?.remove();
    if(!n.querySelector('.warning-icon')){const icon=document.createElement('span');icon.className='warning-icon';icon.textContent='⚠';icon.setAttribute('aria-hidden','true');n.prepend(icon);}
    if(!n.querySelector('.dismiss-note')){const b=document.createElement('button');b.type='button';b.className='dismiss-note';b.textContent='×';b.setAttribute('aria-label','Fechar nota');n.append(b);}
    n.querySelector('.dismiss-note').addEventListener('click',()=>n.hidden=true);
  });
  const definitions=[
    {id:'biography',name:'Biografia'},
    {id:'press',name:'Press kit'},
    {id:'music',name:'Músicas e sets'},
    {id:'video',name:'Vídeos'},
    {id:'booking',name:'Booking',note:'Receção de pedidos por integrar'},
    {id:'events',name:'Eventos',note:'Conteúdo gerido no Muska'},
    {id:'donations',name:'Donativos',soon:true},
    {id:'store',name:'Store · Merchandising',soon:true}
  ];
  let saved=[];try{saved=JSON.parse(localStorage.getItem('mypage-studio-v2-draft')||'{}').layout||[];}catch{}
  const byId=new Map(definitions.map(d=>[d.id,d])), seen=new Set();
  let order=[];
  if(Array.isArray(saved))for(const entry of saved){if(byId.has(entry.id)&&!seen.has(entry.id)){const d=byId.get(entry.id);order.push({...d,visible:d.soon?false:entry.visible!==false});seen.add(entry.id);}}
  definitions.forEach(d=>{if(!seen.has(d.id))order.push({...d,visible:!d.soon});});
  window.getMyPageLayout=()=>order.map(({id,visible})=>({id,visible}));
  const host=document.getElementById('section-order'),status=document.getElementById('order-status');
  function announce(text){status.textContent=text+' Guarda o rascunho para manter esta configuração.';}
  function render(focusId,focusAction){
    host.replaceChildren();
    order.forEach((item,index)=>{
      const row=document.createElement('div');row.className='order-row'+(item.soon?' unavailable':'');
      const pos=document.createElement('span');pos.className='order-index';pos.textContent=String(index+1).padStart(2,'0');row.append(pos);
      const name=document.createElement('span');name.className='order-name';name.textContent=item.name;
      if(item.soon||item.note){const small=document.createElement('small');small.textContent=item.soon?'Brevemente · oculta':item.note;name.append(small);}row.append(name);
      const label=document.createElement('label');label.className='visibility';const check=document.createElement('input');check.type='checkbox';check.checked=item.visible;check.disabled=!!item.soon;check.setAttribute('aria-label','Mostrar '+item.name+' na página');label.append(check,document.createTextNode(item.visible?'Visível':'Oculta'));
      check.addEventListener('change',()=>{item.visible=check.checked;announce(item.name+(item.visible?' visível.':' oculta.'));render(item.id,'visibility');});check.dataset.focus='visibility';check.dataset.id=item.id;row.append(label);
      const actions=document.createElement('div');actions.className='order-actions';
      for(const [action,offset,icon] of [['up',-1,'↑'],['down',1,'↓']]){
        const button=document.createElement('button');button.type='button';button.textContent=icon;button.dataset.id=item.id;button.dataset.focus=action;button.setAttribute('aria-label',(offset<0?'Subir ':'Descer ')+item.name);button.disabled=index+offset<0||index+offset>=order.length;
        button.addEventListener('click',()=>{const target=index+offset;[order[index],order[target]]=[order[target],order[index]];announce(item.name+' movida para a posição '+(target+1)+'.');render(item.id,action);});actions.append(button);
      }
      row.append(actions);host.append(row);
    });
    if(focusId){const preferred=[...host.querySelectorAll('[data-id]')].find(el=>el.dataset.id===focusId&&el.dataset.focus===focusAction&&!el.disabled);const fallback=[...host.querySelectorAll('[data-id]')].find(el=>el.dataset.id===focusId&&!el.disabled);(preferred||fallback)?.focus();}
  }
  render();
})();
