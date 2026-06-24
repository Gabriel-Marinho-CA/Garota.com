class ShippingCalculatorCart extends HTMLElement {
  constructor() {
    super();
    this.calculating = false;
    this.lastZip = "";
  }

  connectedCallback() {
    this.zipInput = this.querySelector(".js-zip");
    this.button = this.querySelector(".js-button");
    this.response = this.querySelector(".shipping__response");
    this.variantInput = this.querySelector("input[name='variant_id']");

    if (!this.zipInput || !this.button) return;

    this.setupMask();
    this.setupEvents();
  }

  setupMask() {
    this.zipInput.addEventListener("input", (e) => {
      let cep = e.target.value.replace(/\D/g, "");

      if (cep.length > 5) {
        cep = cep.slice(0, 5) + "-" + cep.slice(5, 8);
      }

      e.target.value = cep.slice(0, 9);
    });
  }

  setupEvents() {
    this.zipInput.addEventListener("keyup", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await this.calculate();
      }
    });

    this.button.addEventListener("click", async (event) => {
      event.preventDefault();
      await this.calculate();
    });
  }

  async calculate() {
    const zip = this.zipInput.value.trim();

    if (this.calculating) return;
    if (zip === this.lastZip) return;

    const zipClean = zip.replace("-", "");

    if (!zipClean || zipClean.length !== 8) {
      return this.render("Digite um CEP válido.");
    }

    this.calculating = true;
    this.lastZip = zip;
    this.setLoading(true);

    const cart = await this.getCart();

    if (cart.item_count === 0) {
      const variantId = this.variantInput?.value;

      if (!variantId) {
        this.setLoading(false);
        return this.render("Variant ID não encontrado.");
      }

      await this.addItemCart(variantId);
      await this.getShippingRates(zipClean, true);
    } else {
      await this.getShippingRates(zipClean, false);
    }

    this.setLoading(false);
    this.calculating = false;
  }

  async getZipInfo(zip) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zip}/json`);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.erro) return null;

      let state;

      switch (data.uf) {
        case "AC":
          state = "Acre";
          break;
        case "AL":
          state = "Alagoas";
          break;
        case "AM":
          state = "Amazonas";
          break;
        case "AP":
          state = "Amapá";
          break;
        case "BA":
          state = "Bahia";
          break;
        case "CE":
          state = "Ceará";
          break;
        case "DF":
          state = "Distrito Federal";
          break;
        case "ES":
          state = "Espírito Santo";
          break;
        case "GO":
          state = "Goiás";
          break;
        case "MA":
          state = "Maranhão";
          break;
        case "MG":
          state = "Minas Gerais";
          break;
        case "MS":
          state = "Mato Grosso do Sul";
          break;
        case "MT":
          state = "Mato Grosso";
          break;
        case "PA":
          state = "Pará";
          break;
        case "PB":
          state = "Paraíba";
          break;
        case "PE":
          state = "Pernambuco";
          break;
        case "PI":
          state = "Piauí";
          break;
        case "PR":
          state = "Paraná";
          break;
        case "RJ":
          state = "Rio de Janeiro";
          break;
        case "RN":
          state = "Rio Grande do Norte";
          break;
        case "RO":
          state = "Rondônia";
          break;
        case "RR":
          state = "Roraima";
          break;
        case "RS":
          state = "Rio Grande do Sul";
          break;
        case "SC":
          state = "Santa Catarina";
          break;
        case "SE":
          state = "Sergipe";
          break;
        case "SP":
          state = "São Paulo";
          break;
        case "TO":
          state = "Tocantins";
          break;
        default:
          state = "Estado não encontrado";
      }

      data.state = state;

      return data;
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      return null;
    }
  }

  async getCart() {
    try {
      const res = await fetch("/cart.json");
      return await res.json();
    } catch {
      return { item_count: 0 };
    }
  }

  async addItemCart(variantId) {
    try {
      await fetch("/cart/add.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: variantId, quantity: 1 }),
      });
    } catch (err) {
      console.error("Erro ao adicionar item:", err);
    }
  }

  async getShippingRates(zip, clearCart) {
    const zipInfo = await this.getZipInfo(zip);

    if (!zipInfo) {
      return this.render("CEP não encontrado.");
    }

    try {
      const url = `/cart/shipping_rates.json?shipping_address[zip]=${zipInfo.cep}&shipping_address[country]=Brazil&shipping_address[province]=${zipInfo.state}`;

      const res = await fetch(url);
      const data = await res.json();

      this.renderRates(data.shipping_rates);

      if (clearCart) {
        await fetch("/cart/clear.js");
      }
    } catch (err) {
      console.error(err);
      this.render("Erro ao buscar frete.");
    }
  }

  renderRates(rates) {
    if (!rates || rates.length === 0) {
      return this.render("Nós não entregamos para esse endereço.");
    }

    const ul = document.createElement("ul");
    ul.classList.add("response__rates");

    ul.innerHTML = rates
      .map((rate) => {
        return `
          <li>
            <span>
              ${rate.name} -
              <strong>
                ${
                  Number(rate.price) > 0
                    ? this.formatPrice(rate.price)
                    : "GRÁTIS"
                }
              </strong>
            </span>
          </li>
        `;
      })
      .join("");

    this.response.innerHTML = "";
    this.response.appendChild(ul);
  }

  render(message) {
    this.response.innerHTML = message;
  }

  setLoading(state) {
    this.response.classList.toggle("loading", state);
    this.button.disabled = state;
  }

  formatPrice(value) {
    return new Intl.NumberFormat("pt-br", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }
}

customElements.define("shipping-calculator-cart", ShippingCalculatorCart);
