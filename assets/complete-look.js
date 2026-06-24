/**
 * <complete-look-item>
 *
 * Seletores de variante (cor / tamanho) para cada produto do bloco
 * "Complete o look". Lê os radios de opção (swatches de cor e pílulas de
 * tamanho), mantém o input oculto `name="id"` sincronizado com a combinação
 * escolhida e atualiza o estado do botão de adicionar.
 */
if (!customElements.get('complete-look-item')) {
  customElements.define(
    'complete-look-item',
    class CompleteLookItem extends HTMLElement {
      constructor() {
        super();

        this.variants = this.getVariantData();
        this.idInput = this.querySelector('.product-variant-id');
        this.button = this.querySelector('[type="submit"]');
        this.buttonText = this.button ? this.button.querySelector('span') : null;

        this.addLabel = this.dataset.addLabel || '+ ADD';
        this.soldOutLabel = this.dataset.soldOutLabel || 'Esgotado';
        this.unavailableLabel = this.dataset.unavailableLabel || 'Indisponível';

        this.addEventListener('change', this.onOptionChange.bind(this));

        this.updateState();
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
        const checked = Array.from(
          this.querySelectorAll('input[type="radio"][data-option-index]:checked')
        ).sort((a, b) => Number(a.dataset.optionIndex) - Number(b.dataset.optionIndex));
        return checked.map((input) => input.value);
      }

      getMatchingVariant(selectedOptions) {
        return this.variants.find((variant) =>
          selectedOptions.every((value, index) => variant.options[index] === value)
        );
      }

      onOptionChange(event) {
        if (event.target.matches('input[type="radio"][data-option-index]')) {
          this.updateSelectedColorLabel(event.target);
        }
        this.updateState();
      }

      updateSelectedColorLabel(input) {
        const fieldset = input.closest('.product-form__input--swatch');
        if (!fieldset) return;
        const label = fieldset.querySelector('[data-selected-value]');
        if (label) label.textContent = input.value;
      }

      updateState() {
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
