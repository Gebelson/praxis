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
}
