export function createDebug(controller) {
  if(!import.meta.env.DEV || new URLSearchParams(location.search).get('debug')!=='hero') return null;
  const panel=document.createElement('aside');panel.className='praxis-debug';panel.setAttribute('aria-label','Diagnóstico do hero');
  panel.innerHTML='<strong>PRAXIS · Hero diagnóstico</strong><label>Quadro manual <input aria-label="Quadro manual" type="range" min="0" max="88" step="1" value="0"></label><label><input type="checkbox" checked> Exibir cantos</label><button type="button">Retomar scroll</button><pre></pre>';
  document.body.append(panel);controller.showCorners=true;
  panel.querySelector('input[type=range]').oninput=e=>{controller.manual=Number(e.target.value);controller.schedule();};
  panel.querySelector('input[type=checkbox]').onchange=e=>{controller.showCorners=e.target.checked;controller.lastKey='';controller.schedule();};
  panel.querySelector('button').onclick=()=>{controller.manual=null;controller.schedule();};
  return {update(state){panel.querySelector('pre').textContent=JSON.stringify(state,null,2);},destroy(){panel.remove();}};
}
