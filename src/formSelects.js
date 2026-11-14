import './formSelects.css';

export function initFormSelects(root){
  const cleanups=[];
  const phone=root.querySelector('.phone-prefix-btn');
  if(phone){
    const dial=document.createElement('select');dial.id='selectDial';dial.name='codigoPais';dial.className='field-select';dial.dataset.phonePrefix='true';dial.setAttribute('aria-label','Código de país do telefone');
    for(const [code,country] of [['+55','Brasil'],['+351','Portugal'],['+1','Estados Unidos / Canadá'],['+44','Reino Unido'],['+34','Espanha'],['+33','França'],['+54','Argentina']])dial.append(new Option(`${country} (${code})`,code));
    dial.phoneTemplate=phone;phone.before(dial);phone.hidden=true;phone.parentElement.classList.add('has-phone-prefix');
    cleanups.push(()=>{dial.remove();phone.hidden=false;phone.parentElement.classList.remove('has-phone-prefix');});
  }
  root.querySelectorAll('.contact-form-card select.field-select').forEach(select=>{
    const phoneMode=select.dataset.phonePrefix==='true';
    const wrapper=select.parentElement,label=root.querySelector(`label[for="${select.id}"]`);
    const button=document.createElement('button'),menu=document.createElement('div');
    button.type='button';button.id=`${select.id}-control`;button.className='field-select form-select-control';
    if(phoneMode){button.className='phone-prefix-btn form-phone-control';button.innerHTML=select.phoneTemplate.innerHTML;const value=document.createElement('span');value.className='phone-prefix-value';button.insertBefore(value,button.lastElementChild);}
    button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
    menu.id=`${select.id}-options`;menu.className='form-select-menu';menu.setAttribute('role','listbox');menu.hidden=true;
    button.setAttribute('aria-controls',menu.id);
    if(label){label.id||=`${select.id}-label`;label.htmlFor=button.id;button.setAttribute('aria-labelledby',label.id);menu.setAttribute('aria-labelledby',label.id);}
    else button.setAttribute('aria-label',select.getAttribute('aria-label')||select.name);
    const options=[...select.options],nodes=options.map((option,index)=>{
      const node=document.createElement('div');node.id=`${select.id}-option-${index}`;node.className='form-select-option';node.setAttribute('role','option');node.setAttribute('aria-disabled',String(option.disabled));node.textContent=option.textContent;menu.append(node);return node;
    });
    let open=false,active=0,frame=0,animation=null,prefix='',typedAt=0;
    const listeners=[];
    const listen=(target,event,handler,options)=>{target.addEventListener(event,handler,options);listeners.push(()=>target.removeEventListener(event,handler,options));};
    function highlight(index){active=index;nodes.forEach((node,i)=>node.dataset.active=String(i===index));button.setAttribute('aria-activedescendant',nodes[index].id);}
    function sync(){
      if(phoneMode){button.querySelector('.phone-prefix-value').textContent=select.value;button.setAttribute('aria-label',`Código de país: ${options[select.selectedIndex]?.textContent||''}`);}
      else button.textContent=options[select.selectedIndex]?.textContent||'';
      button.disabled=select.disabled;nodes.forEach((node,i)=>node.setAttribute('aria-selected',String(i===select.selectedIndex)));
    }
    function position(){
      frame=0;if(!open)return;
      const rect=(phoneMode?wrapper:button).getBoundingClientRect(),scale=rect.width/(phoneMode?wrapper.offsetWidth:button.offsetWidth);
      const desired=Math.min(280,options.length*40+12)*scale,below=innerHeight-rect.bottom-12,above=rect.top-12;
      const upwards=below<Math.min(desired,160)&&above>below;
      const height=Math.max(40,Math.min(desired,upwards?above:below));
      menu.style.width=`${Math.min(rect.width,innerWidth-16)}px`;menu.style.left=`${Math.max(8,Math.min(rect.left,innerWidth-rect.width-8))}px`;
      menu.style.maxHeight=`${height}px`;menu.style.fontSize=`${parseFloat(getComputedStyle(button).fontSize)*scale}px`;menu.style.setProperty('--option-height',`${Math.max(36,40*scale)}px`);
      menu.style.top=`${upwards?rect.top-height-6:rect.bottom+6}px`;
    }
    function schedule(){if(open&&!frame)frame=requestAnimationFrame(position);}
    function close(){open=false;animation?.cancel();animation=null;menu.hidden=true;button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');cancelAnimationFrame(frame);frame=0;}
    function show(){
      if(button.disabled)return;open=true;menu.hidden=false;sync();highlight(Math.max(0,select.selectedIndex));button.setAttribute('aria-expanded','true');position();
      animation?.cancel();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)animation=menu.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:140,easing:'ease-out'});
      nodes[active].scrollIntoView({block:'nearest'});
    }
    function choose(index){if(options[index].disabled)return;select.selectedIndex=index;sync();select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));close();button.focus({preventScroll:true});}
    function step(direction){let next=active;do{next=(next+direction+options.length)%options.length;}while(options[next].disabled&&next!==active);highlight(next);nodes[next].scrollIntoView({block:'nearest'});}
    listen(button,'click',()=>open?close():show());
    listen(button,'keydown',event=>{
      if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
        event.preventDefault();
        if(event.key==='Escape'){close();return;}
        if(event.key==='Enter'||event.key===' '){if(open)choose(active);else show();return;}
        if(!open)show();
        if(event.key==='Home')highlight(options.findIndex(option=>!option.disabled));
        else if(event.key==='End')highlight(options.findLastIndex(option=>!option.disabled));
        else step(event.key==='ArrowDown'?1:-1);
      }else if(event.key==='Tab')close();
      else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){
        const now=performance.now();prefix=now-typedAt<600?prefix+event.key:event.key;typedAt=now;
        if(!open)show();const found=options.findIndex(option=>!option.disabled&&option.textContent.toLocaleLowerCase().startsWith(prefix.toLocaleLowerCase()));if(found>=0){highlight(found);nodes[found].scrollIntoView({block:'nearest'});}
      }
    });
    nodes.forEach((node,index)=>{listen(node,'pointerdown',event=>{if(event.pointerType==='mouse')event.preventDefault();});listen(node,'click',()=>choose(index));listen(node,'pointermove',()=>{if(!options[index].disabled)highlight(index);});});
    listen(document,'pointerdown',event=>{if(open&&!wrapper.contains(event.target)&&!menu.contains(event.target))close();});
    listen(select,'change',sync);if(select.form)listen(select.form,'reset',()=>queueMicrotask(sync));
    if(phoneMode){
      const country=root.querySelector('#selectPais');
      if(country)listen(country,'change',()=>{const code={BR:'+55',PT:'+351',US:'+1'}[country.value];if(code){select.value=code;sync();select.dispatchEvent(new Event('change',{bubbles:true}));}});
    }
    listen(window,'scroll',schedule,{passive:true});listen(window,'resize',schedule);
    select.hidden=true;wrapper.insertBefore(button,select);document.body.append(menu);sync();
    cleanups.push(()=>{close();listeners.forEach(fn=>fn());button.remove();menu.remove();select.hidden=false;if(label)label.htmlFor=select.id;});
  });
  return ()=>cleanups.forEach(fn=>fn());
}
