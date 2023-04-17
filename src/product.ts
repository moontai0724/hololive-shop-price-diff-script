import { Price } from "./price";
import {
  ITEMS_SELECTOR,
  NAME_SELECTOR,
  PRICE_CONTAINER_SELECTOR,
} from "./selector.env";

export function getItems(): Item[] {
  const items = document.querySelectorAll(ITEMS_SELECTOR);
  const itemArray = Array.from(items);
  return itemArray.map((item, index) => ({
    index,
    name: item.querySelector(NAME_SELECTOR)?.textContent ?? "",
    prices: [],
  }));
}

export function setPrice(price: Price, final = false) {
  const items = document.querySelectorAll(ITEMS_SELECTOR);
  const item = items[price.index];
  if (!item) {
    console.error("Could not find item", price.index);
    throw new Error("Could not find item when set price");
  }

  const priceContainer = item.querySelector(PRICE_CONTAINER_SELECTOR);
  if (!priceContainer) {
    console.error("Could not find price container", price.index);
    throw new Error("Could not find price container when set price");
  }

  const priceElement = document.createElement("div");
  priceElement.style.fontSize = "75%";
  priceElement.style.opacity = final ? "0.8" : "0.5";
  priceElement.classList.add("money");
  priceElement.classList.add("reference-price");
  priceElement.setAttribute("currency", price.currency.currencyLabel);
  priceElement.textContent = `${
    price.currency.currencyLabel
  }: (~${price.localPrice.toFixed(2)} JPY) ${price.priceLabel}`;
  const countries = price.currency.countries
    .map(country => country.countryLabel)
    .join("\n");
  priceElement.setAttribute("title", countries);
  priceContainer.appendChild(priceElement);
}

export interface Item {
  index: number;
  name: string;
  prices: Price[];
}
