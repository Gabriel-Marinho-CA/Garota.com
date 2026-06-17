(function () {
  'use strict';

  // ─── Storage API ────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'res_wishlist';

  const WishlistStore = {
    getIds() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    },

    has(productId) {
      return this.getIds().includes(String(productId));
    },

    add(productId) {
      const id  = String(productId);
      const ids = this.getIds();
      if (ids.includes(id)) return;
      ids.push(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      this._emit(id, true);
    },

    remove(productId) {
      const id  = String(productId);
      const ids = this.getIds().filter(i => i !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      this._emit(id, false);
    },

    toggle(productId) {
      this.has(productId) ? this.remove(productId) : this.add(productId);
    },

    count() {
      return this.getIds().length;
    },

    clear() {
      localStorage.removeItem(STORAGE_KEY);
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
        console.log("@@")
      e.preventDefault();
      WishlistStore.toggle(this._id);
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
