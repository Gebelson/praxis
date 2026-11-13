/**
 * PRAXIS — Seletor de Idioma Refinado com Animação Fluida e Acessibilidade
 * 
 * - Rotação suave da seta: 0° (direita) -> 90° (baixo) em 250ms com cubic-bezier(0.22, 1, 0.36, 1)
 * - Fechamento da seta: 90° -> 0° em 220ms
 * - Dropdown com abertura suave: opacidade 0->1, translateY(-6px)->0, scale(1, 0.96)->1 em 220ms
 * - Dropdown com fechamento suave: opacidade 1->0, translateY(0)->-4px em 160ms
 * - Interrupção suave sem saltos caso o usuário abra e feche rapidamente
 * - Navegação completa por teclado (ArrowUp, ArrowDown, Enter, Space, Escape, Tab)
 * - Fechamento ao clicar fora
 * - Roving tabindex e ARIA sincronizados
 */

export function initLangSelector() {
  const langWrap = document.getElementById('langSelectorWrap') || document.querySelector('.lang-selector-wrap');
  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');

  if (!langBtn || !langDropdown) return;

  const options = Array.from(langDropdown.querySelectorAll('li[role="option"]'));

  function isOpen() {
    return langBtn.getAttribute('aria-expanded') === 'true';
  }

  function openDropdown(focusSelected = false) {
    langBtn.setAttribute('aria-expanded', 'true');
    langDropdown.classList.add('is-open');
    if (langWrap) langWrap.classList.add('is-open');

    if (focusSelected) {
      const selected = options.find((opt) => opt.getAttribute('aria-selected') === 'true') || options[0];
      if (selected) {
        options.forEach((opt) => opt.setAttribute('tabindex', opt === selected ? '0' : '-1'));
        selected.focus();
      }
    }
  }

  function closeDropdown(restoreFocus = false) {
    langBtn.setAttribute('aria-expanded', 'false');
    langDropdown.classList.remove('is-open');
    if (langWrap) langWrap.classList.remove('is-open');

    if (restoreFocus) {
      langBtn.focus();
    }
  }

  function toggleDropdown(focusSelected = false) {
    if (isOpen()) {
      closeDropdown();
    } else {
      openDropdown(focusSelected);
    }
  }

  function selectOption(option) {
    const selectedLang = option.getAttribute('data-lang');
    options.forEach((li) => {
      li.setAttribute('aria-selected', 'false');
      li.setAttribute('tabindex', '-1');
    });

    option.setAttribute('aria-selected', 'true');
    option.setAttribute('tabindex', '0');

    const strongEl = langBtn.querySelector('strong');
    if (strongEl && selectedLang) {
      strongEl.textContent = selectedLang;
    }

    closeDropdown(true);
  }

  // Click no botão para alternar
  langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(false);
  });

  // Teclado no botão: ArrowDown ou Enter ou Space abre e foca o item selecionado
  langBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDropdown(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      openDropdown(true);
    } else if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      closeDropdown(false);
    }
  });

  // Eventos de clique nas opções
  options.forEach((option) => {
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      selectOption(option);
    });

    // Teclado dentro do dropdown
    option.addEventListener('keydown', (e) => {
      const currentIndex = options.indexOf(option);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % options.length;
        options.forEach((opt, idx) => opt.setAttribute('tabindex', idx === nextIndex ? '0' : '-1'));
        options[nextIndex].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + options.length) % options.length;
        options.forEach((opt, idx) => opt.setAttribute('tabindex', idx === prevIndex ? '0' : '-1'));
        options[prevIndex].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        options[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        options[options.length - 1].focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectOption(option);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(true);
      } else if (e.key === 'Tab') {
        // Ao tabular para fora, fecha suavemente
        closeDropdown(false);
      }
    });
  });

  // Fechar ao clicar fora
  document.addEventListener('click', (e) => {
    if (isOpen() && langWrap && !langWrap.contains(e.target)) {
      closeDropdown(false);
    }
  });

  // Fechar com Escape em qualquer lugar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      closeDropdown(true);
    }
  });
}
