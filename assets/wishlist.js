(function () {
  'use strict';

  // ─── Storage API ────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'res_wishlist';
  // Mapa paralelo { [id]: { handle, url, title } } — guarda o necessário para
  // renderizar o card na página de favoritos a partir do ID salvo.
  const META_KEY = 'res_wishlist_meta';

  const WishlistStore = {
    getIds() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    },

    getMeta() {
      try {
        return JSON.parse(localStorage.getItem(META_KEY) || '{}');
      } catch {
        return {};
      }
    },

    _setMeta(map) {
      localStorage.setItem(META_KEY, JSON.stringify(map));
    },

    // Garante que o meta de um item já salvo seja preenchido (backfill quando o
    // card é renderizado depois de um add feito antes deste recurso existir).
    ensureMeta(productId, meta) {
      if (!meta || !meta.handle) return;
      const id  = String(productId);
      if (!this.getIds().includes(id)) return;
      const map = this.getMeta();
      const cur = map[id] || {};
      if (cur.handle === meta.handle && cur.url === meta.url) return;
      map[id] = meta;
      this._setMeta(map);
    },

    has(productId) {
      return this.getIds().includes(String(productId));
    },

    add(productId, meta) {
      const id  = String(productId);
      const ids = this.getIds();
      if (meta && meta.handle) {
        const map = this.getMeta();
        map[id] = meta;
        this._setMeta(map);
      }
      if (ids.includes(id)) return;
      ids.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      this._emit(id, true);
    },

    remove(productId) {
      const id  = String(productId);
      const ids = this.getIds().filter(i => i !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      const map = this.getMeta();
      if (map[id]) {
        delete map[id];
        this._setMeta(map);
      }
      this._emit(id, false);
    },

    toggle(productId, meta) {
      this.has(productId) ? this.remove(productId) : this.add(productId, meta);
    },

    count() {
      return this.getIds().length;
    },

    clear() {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(META_KEY);
      this._emit(null, false);
    },

    _emit(productId, added) {
      window.dispatchEvent(
        new CustomEvent('wishlist:change', {
          bubbles: true,
          detail: { productId, added, ids: this.getIds(), count: this.getIds().length }
        })
      );
    }
  };

  window.WishlistStore = WishlistStore;

  // ─── <wishlist-button> Web Component ────────────────────────────────────────
  //
  // Usage:
  //   <wishlist-button product-id="123456789">
  //     <button ...>...</button>
  //   </wishlist-button>
  //
  // Attributes:
  //   product-id  (required) — Shopify product ID
  //
  // CSS hooks:
  //   [active]              — product is in wishlist
  //   .is-animating         — briefly added on toggle for micro-animation

  class WishlistButton extends HTMLElement {
    connectedCallback() {
      this._id  = this.getAttribute('product-id');
      this._btn = this.querySelector('button');
      this._meta = {
        handle: this.dataset.handle || '',
        url: this.dataset.url || '',
        title: this.dataset.title || ''
      };

      // Backfill: se o produto já está nos favoritos mas sem meta (salvo antes
      // deste recurso), grava o handle agora que o card está em tela.
      WishlistStore.ensureMeta(this._id, this._meta);

      this._render();

      this._handleClick = this._onClick.bind(this);
      this._handleChange = this._onWishlistChange.bind(this);

      this.addEventListener('click', this._handleClick);
      window.addEventListener('wishlist:change', this._handleChange);
    }

    disconnectedCallback() {
      this.removeEventListener('click', this._handleClick);
      window.removeEventListener('wishlist:change', this._handleChange);
    }

    _onClick(e) {
      e.preventDefault();
      WishlistStore.toggle(this._id, this._meta);
      this._animate();
    }

    _onWishlistChange(e) {
      // Sync all buttons for this product, regardless of which triggered the change
      if (e.detail.productId === this._id || e.detail.productId === null) {
        this._render();
      }
    }

    _render() {
      const active = WishlistStore.has(this._id);
      this.toggleAttribute('active', active);

      if (!this._btn) return;
      this._btn.setAttribute('aria-pressed', String(active));
      this._btn.setAttribute(
        'aria-label',
        active ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'
      );
    }

    _animate() {
      this.classList.add('is-animating');
      this.addEventListener('animationend', () => this.classList.remove('is-animating'), { once: true });
    }
  }

  if (!customElements.get('wishlist-button')) {
    customElements.define('wishlist-button', WishlistButton);
  }

  // ─── <wishlist-count> Web Component ─────────────────────────────────────────
  //
  // Displays the total wishlist count — useful in header icons.
  //
  // Usage:
  //   <wishlist-count class="wishlist-count"></wishlist-count>

  class WishlistCount extends HTMLElement {
    connectedCallback() {
      this._handleChange = () => this._render();
      window.addEventListener('wishlist:change', this._handleChange);
      this._render();
    }

    disconnectedCallback() {
      window.removeEventListener('wishlist:change', this._handleChange);
    }

    _render() {
      const n = WishlistStore.count();
      this.textContent = n > 0 ? String(n) : '';
      this.toggleAttribute('hidden', n === 0);
    }
  }

  if (!customElements.get('wishlist-count')) {
    customElements.define('wishlist-count', WishlistCount);
  }
})();
