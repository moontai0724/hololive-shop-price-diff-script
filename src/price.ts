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
  const items = await getItems(currency);
  const prices: Price[] = [];

  for (const item of items) {
    const price = await getPriceOfItem(item, currency, localCurrency);
    prices.push(price);
  }

  cachePrices(currency, prices);

  return prices;
}

async function getItems(currency: Currency): Promise<BasicItem[]> {
  const cached = getCachedPrice(currency);
  if (cached) return cached.items;

  const document = await getProductPageInCountry(
    currency.countries[0].countryCode,
  );
  const itemElements = Array.from(document.querySelectorAll(ITEMS_SELECTOR));
  const items: BasicItem[] = [];

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

    items.push({
      index: index++,
      name: name.textContent ?? "",
      priceLabel,
    });
  }

  return items;
}

async function getPriceOfItem(
  item: BasicItem,
  currency: Currency,
  localCurrency = "JPY",
): Promise<Price> {
  const parser = parsecurrency(`${currency.currencyLabel} ${item.priceLabel}`);
  const price = parser?.value ?? 0;

  const exchangeRate = await getExchangeRate(
    currency.currencyLabel,
    localCurrency,
  );
  const localPrice = price * exchangeRate;

  return {
    index: item.index,
    name: item.name,
    priceLabel: item.priceLabel,
    price,
    localPrice,
    currency,
  };
}

function getCacheKey(currency: Currency): string {
  return `price-cache-${location.pathname}-${currency.currencyLabel}`;
}

function getCachedPrice(currency: Currency): CachedPrice | null {
  const key = getCacheKey(currency);
  const cachedPrice = GM_getValue(key, null) as CachedPrice | null;

  if (
    cachedPrice &&
    cachedPrice.timestamp < Date.now() - 30 * 24 * 60 * 60 * 1000
  ) {
    GM_deleteValue(key);
    return null;
  }

  return cachedPrice;
}

function cachePrices(currency: Currency, prices: Price[]) {
  const key = getCacheKey(currency);
  const cachedPrice: CachedPrice = {
    timestamp: Date.now(),
    location: location.pathname,
    currencyLabel: currency.currencyLabel,
    items: prices.map(price => ({
      index: price.index,
      name: price.name,
      priceLabel: price.priceLabel,
    })),
  };
  GM_setValue(key, cachedPrice);
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

interface CachedPrice {
  timestamp: number;
  location: string; // location.pathname
  currencyLabel: string;
  items: BasicItem[];
}

interface BasicItem {
  index: number;
  name: string;
  priceLabel: string;
}
