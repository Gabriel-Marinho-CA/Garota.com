/**
 * <complete-look-item>
 *
 * Seletores de variante (tamanho / cor) para cada produto do bloco
 * "Complete o look". Mantém o input oculto `name="id"` sincronizado com a
 * combinação de opções escolhida e atualiza o estado do botão de adicionar.
 */
if (!customElements.get('complete-look-item')) {
  customElements.define(
    'complete-look-item',
    class CompleteLookItem extends HTMLElement {
      constructor() {
        super();

        this.variants = this.getVariantData();
        this.selects = Array.from(this.querySelectorAll('select[data-option-index]')).sort(
          (a, b) => Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex)
        );
        this.idInput = this.querySelector('.product-variant-id');
        this.button = this.querySelector('[type="submit"]');
        this.buttonText = this.button ? this.button.querySelector('span') : null;

        this.addLabel = this.dataset.addLabel || '+ ADD';
        this.soldOutLabel = this.dataset.soldOutLabel || 'Esgotado';
        this.unavailableLabel = this.dataset.unavailableLabel || 'Indisponível';

        this.selects.forEach((select) =>
          select.addEventListener('change', this.onSelectChange.bind(this))
        );

        this.onSelectChange();
      }

      getVariantData() {
        const script = this.querySelector('.complete-look__variant-data');
        if (!script) return [];
        try {
          return JSON.parse(script.textContent);
        } catch (error) {
          return [];
        }
      }

      getSelectedOptions() {
        return this.selects.map((select) => select.value);
      }

      getMatchingVariant(selectedOptions) {
        return this.variants.find((variant) =>
          selectedOptions.every((value, index) => variant.options[index] === value)
        );
      }

      onSelectChange() {
        const variant = this.getMatchingVariant(this.getSelectedOptions());

        if (!variant) {
          this.setButtonState(false, this.unavailableLabel);
          return;
        }

        if (this.idInput) this.idInput.value = variant.id;

        if (variant.available) {
          this.setButtonState(true, this.addLabel);
        } else {
          this.setButtonState(false, this.soldOutLabel);
        }
      }

      setButtonState(enabled, text) {
        if (!this.button) return;
        this.button.disabled = !enabled;
        this.button.classList.toggle('complete-look__add--disabled', !enabled);
        if (this.buttonText) this.buttonText.textContent = text;
      }
    }
  );
}
