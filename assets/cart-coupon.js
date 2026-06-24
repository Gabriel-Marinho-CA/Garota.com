/**
 * Cart Coupon
 * Aplica e remove cupons de desconto no carrinho.
 * O desconto efetivo só aparece no checkout (limitação do Shopify).
 */

(function () {
  const STORAGE_KEY = 'tp_applied_coupons';

  function getAppliedCoupons() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAppliedCoupons(codes) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }

  function showFeedback(container, message, type) {
    const feedback = container.querySelector('[data-coupon-feedback]');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = 'cart-coupon__feedback cart-coupon__feedback--' + type;
    feedback.hidden = false;

    if (type === 'success') {
      setTimeout(() => {
        feedback.hidden = true;
        feedback.textContent = '';
      }, 3000);
    }
  }

  function renderTags(container) {
    const list = container.querySelector('[data-coupon-list]');
    const tags = container.querySelector('[data-coupon-tags]');
    const codes = getAppliedCoupons();

    if (!codes.length) {
      list.hidden = true;
      tags.innerHTML = '';
      return;
    }

    list.hidden = false;
    tags.innerHTML = codes
      .map(
        (code) => `
        <span class="cart-coupon__tag">
          ${code}
          <button type="button" class="cart-coupon__tag-remove" data-coupon-remove="${code}" aria-label="Remover cupom ${code}">×</button>
        </span>
      `
      )
      .join('');
  }

  async function applyCoupon(container, code) {
    const applyBtn = container.querySelector('[data-coupon-apply]');
    const input = container.querySelector('[data-coupon-input]');

    code = code.trim().toUpperCase();
    if (!code) {
      showFeedback(container, 'Digite um cupom.', 'error');
      return;
    }

    const current = getAppliedCoupons();
    if (current.includes(code)) {
      showFeedback(container, 'Esse cupom já foi aplicado.', 'error');
      return;
    }

    applyBtn.disabled = true;

    try {
      // 1. Seta o cookie de desconto via endpoint público do Shopify.
      await fetch(`${window.Shopify.routes.root}discount/${encodeURIComponent(code)}`, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'same-origin',
      });

      // 2. Valida se o cupom realmente foi aplicado ao carrinho.
      const cartResp = await fetch(`${window.Shopify.routes.root}cart.js`, { credentials: 'same-origin' });
      const cart = await cartResp.json();
      const entry = (cart.discount_codes || []).find(
        (d) => d.code.toUpperCase() === code
      );

      if (!entry || entry.applicable === false) {
        showFeedback(container, 'Cupom inválido ou não aplicável ao carrinho.', 'error');
        return;
      }

      current.push(code);
      saveAppliedCoupons(current);
      input.value = '';

      // 3. Re-renderiza o drawer para atualizar o total descontado.
      // Isso substitui o HTML do container atual, então o feedback vai no novo.
      await refreshCartDrawer();
      const fresh = document.querySelector('[data-cart-coupon]');
      if (fresh) showFeedback(fresh, 'Cupom aplicado!', 'success');
    } catch (err) {
      showFeedback(container, 'Não foi possível aplicar o cupom.', 'error');
    } finally {
      applyBtn.disabled = false;
    }
  }

  // Re-busca a seção do drawer e troca o HTML interno para refletir os totais.
  async function refreshCartDrawer() {
    const resp = await fetch(
      `${window.Shopify.routes.root}?sections=cart-drawer,cart-icon-bubble`,
      { credentials: 'same-origin' }
    );
    const sections = await resp.json();

    if (sections['cart-drawer']) {
      const doc = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
      const newInner = doc.querySelector('.drawer__inner');
      const currentInner = document.querySelector('#CartDrawer .drawer__inner');
      if (newInner && currentInner) currentInner.innerHTML = newInner.innerHTML;
    }

    if (sections['cart-icon-bubble']) {
      const doc = new DOMParser().parseFromString(sections['cart-icon-bubble'], 'text/html');
      const newBubble = doc.querySelector('.cart-count-bubble');
      const currentBubble = document.querySelector('#cart-icon-bubble .cart-count-bubble');
      if (newBubble && currentBubble) currentBubble.innerHTML = newBubble.innerHTML;
    }
  }

  function removeCoupon(container, code) {
    const codes = getAppliedCoupons().filter((c) => c !== code);
    saveAppliedCoupons(codes);

    // Limpa o cookie do Shopify visitando /discount/clear-equivalente
    // (não há endpoint oficial, então a remoção é apenas visual aqui).
    // Se o cliente reaplicar outro código, ele substitui no checkout.

    renderTags(container);
  }

  function init(container) {
    if (!container || container.dataset.couponInit === 'true') return;
    container.dataset.couponInit = 'true';

    const applyBtn = container.querySelector('[data-coupon-apply]');
    const input = container.querySelector('[data-coupon-input]');

    applyBtn.addEventListener('click', () => applyCoupon(container, input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCoupon(container, input.value);
      }
    });

    container.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-coupon-remove]');
      if (removeBtn) {
        removeCoupon(container, removeBtn.dataset.couponRemove);
      }
    });

    renderTags(container);
  }

  function initAll() {
    document.querySelectorAll('[data-cart-coupon]').forEach(init);
  }

  // Inicializa quando o DOM carrega
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Reinicializa quando o cart drawer é atualizado dinamicamente
  // (o Shopify substitui o HTML do drawer ao adicionar/remover itens)
  document.addEventListener('cart:refresh', initAll);

  // Observer pra detectar quando o cart drawer renderiza de novo
  const observer = new MutationObserver(() => initAll());
  const drawer = document.querySelector('cart-drawer');
  if (drawer) {
    observer.observe(drawer, { childList: true, subtree: true });
  }
})();