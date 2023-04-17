import { getCurrencies } from "./currency";
import { getPrice } from "./price";
import { getItems, setPrice } from "./product";

entrypoint();

async function entrypoint() {
  await waitForElement("form[action='/localization']");

  const items = getItems();

  const currencies = getCurrencies();
  for (const currency of currencies) {
    const prices = await getPrice(currency);
    for (const price of prices) {
      setPrice(price);
      const item = items[price.index];
      if (item.name !== price.name) {
        console.warn("Item name is different", item, price);
      }
      items[price.index].prices.push(price);
    }
  }

  document.querySelectorAll(".reference-price").forEach(e => e.remove());
  for (const item of items) {
    const prices = item.prices.sort((a, b) => a.localPrice - b.localPrice);
    for (const price of prices) {
      setPrice(price);
    }
  }
}

function waitForElement(selector: string): Promise<Element> {
  return new Promise(resolve => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}
