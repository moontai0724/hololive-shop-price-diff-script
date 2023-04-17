import parsecurrency from "parsecurrency";
import { Currency } from "./currency";
import {
  ITEMS_SELECTOR,
  NAME_SELECTOR,
  PRICE_CONTAINER_SELECTOR,
} from "./selector.env";
import { getExchangeRate } from "./exchange-rate";

/**
 * Get the price of the product items in the currency
 * @param currency Get the price of the product in this currency
 * @param localCurrency Convert the price to this currency
 * @returns The price of the product items in the currency
 */
export async function getPrice(
  currency: Currency,
  localCurrency = "JPY",
): Promise<Price[]> {
  const document = await getProductPageInCountry(
    currency.countries[0].countryCode,
  );
  const itemElements = Array.from(document.querySelectorAll(ITEMS_SELECTOR));
  const items: Price[] = [];

  let index = 0;
  for (const item of itemElements) {
    const name = item.querySelector(NAME_SELECTOR);
    const priceContainer = item.querySelector(PRICE_CONTAINER_SELECTOR);
    if (!name || !priceContainer) {
      console.error("Could not find name or price container", index++, item);
      throw new Error("Could not find name or price container");
    }

    const priceLabel = priceContainer.textContent;
    if (!priceLabel) {
      console.error("Could not find price", index++);
      throw new Error("Could not find price");
    }

    const parser = parsecurrency(`${currency.currencyLabel} ${priceLabel}`);
    const price = parser?.value ?? 0;

    const exchangeRate = await getExchangeRate(
      currency.currencyLabel,
      localCurrency,
    );
    const localPrice = price * exchangeRate;

    items.push({
      index: index++,
      name: name.textContent ?? "",
      priceLabel,
      price,
      localPrice,
      currency,
    });
  }

  return items;
}

/**
 * Get product page html in target currency by country code
 * @param countryCode Country code of target currency
 * @returns HTML document of product page in target currency
 */
async function getProductPageInCountry(countryCode: string): Promise<Document> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: location.href,
      cookie: `localization=${countryCode}`,
      anonymous: true,
      onload: response => {
        const html = new DOMParser().parseFromString(
          response.responseText,
          "text/html",
        );
        resolve(html);
      },
      onerror: error => {
        reject(error);
      },
    });
  });
}

export interface Price {
  index: number;
  name: string;
  priceLabel: string;
  price: number;
  localPrice: number;
  currency: Currency;
}
