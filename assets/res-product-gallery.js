/* RES__PRODUCT_GALLERY__V1 */

/* Web component do vídeo: dá play mutado, com controles. Carrega a mídia só quando
   tocada (template clonado sob demanda) e pausa ao sair do slide. */
class ResProductVideo extends HTMLElement {
  connectedCallback() {
    if (this._bound) return;
    this._bound = true;
    this.type = this.dataset.type || 'native';
    this.poster = this.querySelector('.res-pg__video-poster');
    this.tpl = this.querySelector('template');
    this.stage = null;
    this.el = null;
    if (this.poster) {
      this.poster.addEventListener('click', () => this.play());
    }
  }

  _ensureStage() {
    if (this.stage || !this.tpl) return;
    this.stage = document.createElement('div');
    this.stage.className = 'res-pg__video-stage';
    this.stage.appendChild(this.tpl.content.cloneNode(true));
    this.appendChild(this.stage);
    this.el = this.stage.querySelector('video, iframe');
  }

  play() {
    this._ensureStage();
    this.classList.add('is-playing');
    if (this.el && this.el.tagName === 'VIDEO') {
      this.el.muted = true;
      this.el.controls = true;
      const p = this.el.play();
      if (p && p.catch) p.catch(() => {});
    }
  }

  pause() {
    if (!this.stage || !this.el) return;
    if (this.el.tagName === 'VIDEO') {
      this.el.pause();
    } else {
      /* Embeds (YouTube/Vimeo): remover o iframe é a forma confiável de parar. */
      this.stage.remove();
      this.stage = null;
      this.el = null;
      this.classList.remove('is-playing');
    }
  }
}
if (!customElements.get('res-product-video')) {
  customElements.define('res-product-video', ResProductVideo);
}

class ResProductGallery extends HTMLElement {
  connectedCallback() {
    if (this._bound) return;
    this._bound = true;

    this.colorIndex = parseInt(this.dataset.colorIndex || '-1', 10);
    this.mainEl = this.querySelector('.res-pg__main');
    this.thumbsEl = this.querySelector('.res-pg__thumbs');
    this.mainWrapper = this.mainEl ? this.mainEl.querySelector('.swiper-wrapper') : null;
    this.thumbsWrapper = this.thumbsEl ? this.thumbsEl.querySelector('.swiper-wrapper') : null;
    if (!this.mainWrapper || !this.thumbsWrapper) return;

    /* Lista mestra de slides (ordem original) — main e thumbs são alinhados por índice. */
    this._mainNodes = Array.from(this.mainWrapper.children);
    this._thumbNodes = Array.from(this.thumbsWrapper.children);

    this._activeColor = this._currentColor() || this._normalize(this.dataset.initialColor || '');

    this._whenSwiperReady(() => {
      if (this.colorIndex >= 0 && this._activeColor) {
        this._applyColor(this._activeColor);
      } else {
        this._buildSwipers();
      }
    });

    this._bindVariantChange();
  }

  disconnectedCallback() {
    this._destroySwipers();
  }

  _whenSwiperReady(cb) {
    if (typeof Swiper !== 'undefined') {
      cb();
    } else {
      window.addEventListener('load', () => {
        if (typeof Swiper !== 'undefined') cb();
      }, { once: true });
    }
  }

  _normalize(str) {
    return (str || '').toLowerCase().replace(/\s+/g, '-');
  }

  _currentColor() {
    if (this.colorIndex < 0) return '';
    const picker = document.querySelector('variant-radios, variant-selects');
    if (!picker) return '';
    const fieldset = picker.querySelectorAll('fieldset')[this.colorIndex];
    if (fieldset) {
      const checked = fieldset.querySelector('input:checked');
      if (checked) return this._normalize(checked.value);
    }
    const select = picker.querySelectorAll('select')[this.colorIndex];
    if (select) return this._normalize(select.value);
    return '';
  }

  _matchingIndexes(color) {
    const all = this._mainNodes.map((_, i) => i);
    if (!color) return all;
    const matched = [];
    this._mainNodes.forEach((node, i) => {
      const group = this._normalize(node.dataset.groupColor);
      /* Mídias sem cor definida (ex.: lifestyle/genéricas) aparecem em todas as cores. */
      if (!node.dataset.groupColor || group === color) matched.push(i);
    });
    return matched.length ? matched : all;
  }

  _bindVariantChange() {
    if (this.colorIndex < 0) return;
    document.addEventListener('change', (e) => {
      const picker = document.querySelector('variant-radios, variant-selects');
      if (!picker) return;
      const fieldset = picker.querySelectorAll('fieldset')[this.colorIndex];
      if (!fieldset || !fieldset.contains(e.target)) return;
      const color = this._currentColor();
      if (color && color !== this._activeColor) {
        this._activeColor = color;
        this._whenSwiperReady(() => this._applyColor(color));
      }
    });
  }

  _applyColor(color) {
    this._pauseAll();
    this._destroySwipers();

    const idx = this._matchingIndexes(color);
    this.mainWrapper.replaceChildren(...idx.map((i) => this._mainNodes[i]));
    this.thumbsWrapper.replaceChildren(...idx.map((i) => this._thumbNodes[i]));

    this._buildSwipers();
  }

  _pauseAll() {
    this.querySelectorAll('res-product-video').forEach((v) => v.pause && v.pause());
  }

  _destroySwipers() {
    if (this._main) { this._main.destroy(true, true); this._main = null; }
    if (this._thumbs) { this._thumbs.destroy(true, true); this._thumbs = null; }
  }

  _buildSwipers() {
    if (typeof Swiper === 'undefined') return;

    this._thumbs = new Swiper(this.thumbsEl, {
      direction: 'vertical',
      slidesPerView: 'auto',
      spaceBetween: 8,
      freeMode: true,
      watchSlidesProgress: true,
    });

    const self = this;
    this._main = new Swiper(this.mainEl, {
      slidesPerView: 1,
      spaceBetween: 0,
      navigation: {
        prevEl: this.querySelector('.res-pg__nav--prev'),
        nextEl: this.querySelector('.res-pg__nav--next'),
      },
      pagination: {
        el: this.querySelector('.res-pg__dots'),
        clickable: true,
      },
      thumbs: { swiper: this._thumbs },
      on: {
        init() { self._onSlideChange(); },
        slideChange() { self._onSlideChange(); },
      },
    });
  }

  _onSlideChange() {
    const slides = this.mainEl.querySelectorAll('.swiper-slide');
    const active = this.mainEl.querySelector('.swiper-slide-active');
    slides.forEach((slide) => {
      const video = slide.querySelector('res-product-video');
      if (!video) return;
      if (slide === active) {
        video.play && video.play();
      } else {
        video.pause && video.pause();
      }
    });
  }
}
if (!customElements.get('res-product-gallery')) {
  customElements.define('res-product-gallery', ResProductGallery);
}
