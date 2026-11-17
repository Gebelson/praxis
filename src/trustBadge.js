/**
 * PRAXIS — Controlador do Bloco de Confiança & Prova Social (Seção 2)
 *
 * Gerencia a renderização modular dos avatares individuais a partir da fonte
 * de dados 'src/data/trustAvatars.js', assegurando:
 * 1. Círculos perfeitos sem recortes ou amputações horizontais.
 * 2. Enquadramento facial otimizado via object-position.
 * 3. Sobreposição em cascata com borda branca e z-index incremental.
 * 4. Alinhamento automático e simétrico entre o traço superior + estrelas e o texto.
 */
import { trustAvatars } from './data/trustAvatars.js';

export function renderTrustAvatars() {
  const container = document.getElementById('trustAvatarsList');
  if (!container) return;

  container.innerHTML = trustAvatars.map((av, index) => {
    const objPos = av.objectPosition || 'center center';
    const objFit = av.objectFit || 'cover';
    return `
      <div class="trust-avatar-item" style="--z: ${index + 1};" data-avatar-id="${av.id}">
        <img
          src="${av.image}"
          alt="${av.alt || av.name}"
          class="trust-avatar-img"
          style="object-position: ${objPos}; object-fit: ${objFit};"
          loading="eager"
          decoding="async"
        />
      </div>
    `;
  }).join('');
}

export function initTrustBadge() {
  renderTrustAvatars();
  const column=document.querySelector('.sec2-left-content'),heading=column?.querySelector('.sec2-heading');
  if(!heading||column.checksLayout)return;
  let frame=0,alive=true;
  const measure=()=>{
    frame=0;if(!alive)return;
    const parent=column.getBoundingClientRect(),box=heading.getBoundingClientRect();
    const scale=box.width/heading.offsetWidth;if(!scale)return;
    const bounds=[...heading.children].map(line=>{const range=document.createRange();range.selectNodeContents(line);return range.getBoundingClientRect();});
    const left=Math.min(...bounds.map(r=>r.left)),right=Math.max(...bounds.map(r=>r.right));
    column.style.setProperty('--checks-left',`${(left-parent.left)/scale}px`);
    column.style.setProperty('--checks-width',`${(right-left)/scale}px`);
  };
  const schedule=()=>{if(alive&&!frame)frame=requestAnimationFrame(measure);};
  const observer=new ResizeObserver(schedule);observer.observe(heading);observer.observe(column);
  document.fonts.ready.then(schedule);document.fonts.addEventListener('loadingdone',schedule);
  window.addEventListener('resize',schedule,{passive:true});measure();
  column.checksLayout={destroy(){alive=false;cancelAnimationFrame(frame);observer.disconnect();document.fonts.removeEventListener('loadingdone',schedule);window.removeEventListener('resize',schedule);delete column.checksLayout;}};
  import.meta.hot?.dispose(()=>column.checksLayout?.destroy());
}
