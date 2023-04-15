import { default as parsecurrency } from "parsecurrency";

entrypoint();

const ITEMS_SELECTOR =
  ".ProductOption__container--variants .ProductOption__item--select";
const NAME_SELECTOR = ".ProductOption__label--product";
const PRICE_CONTAINER_SELECTOR = ".ProductOption__label--price";

async function entrypoint() {
  await waitForElement("form[action='/localization']");

  const products: Product[] = [];
  const originalItems = document.querySelectorAll(ITEMS_SELECTOR);
  originalItems.forEach((item, index) => {
    const name = item.querySelector(NAME_SELECTOR);
    if (!name) {
      console.error("Could not find name for item", index, item);
    }

    products.push({
      index,
      name: name?.textContent ?? "",
      prices: [],
    });
  });

  const currencyInfos: CurrencyInfo[] = getCurrencyInfos();
  for (const currencyInfo of currencyInfos) {
    const productInfo = await getProductInfo(
      currencyInfo.countries[0].countryCode,
    );

    const html = new DOMParser().parseFromString(productInfo, "text/html");
    const itemElements = html.querySelectorAll(ITEMS_SELECTOR);
    if (products.length !== itemElements.length) {
      console.error(
        "Items does not match",
        currencyInfo,
        products,
        itemElements,
      );
      continue;
    }

    for (const product of products) {
      const itemElement = itemElements[product.index];
      const priceContainer = itemElement.querySelector(
        PRICE_CONTAINER_SELECTOR,
      );
      if (!priceContainer) {
        console.error(
          "Could not find price container",
          currencyInfo,
          product.index,
        );
        continue;
      }

      const price = priceContainer.textContent;
      if (!price) {
        console.error("Could not find price", product.index);
        continue;
      }

      const currency = parsecurrency(`${currencyInfo.currencyLabel} ${price}`);
      const priceNumber = currency?.value ?? 0;

      const exchangeRate = await getExchangeRate(
        currencyInfo.currencyLabel,
        "JPY",
      );
      const localPrice = priceNumber * exchangeRate;

      product.prices.push({
        price,
        localPrice,
        currencyInfo,
      });

      const originalPriceContainer = originalItems[product.index].querySelector(
        PRICE_CONTAINER_SELECTOR,
      );
      if (!originalPriceContainer) {
        console.error(
          "Could not find original price container",
          currencyInfo,
          product.index,
        );
        continue;
      }

      const priceElement = document.createElement("div");
      priceElement.classList.add("money");
      priceElement.setAttribute("currency", currencyInfo.currencyLabel);
      priceElement.textContent = `${
        currencyInfo.currencyLabel
      }: (~${localPrice.toFixed(2)} JPY) ${price}`;
      const countries = currencyInfo.countries
        .map(country => country.countryLabel)
        .join("\n");
      priceElement.setAttribute("title", countries);
      originalPriceContainer.appendChild(priceElement);
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

async function getProductInfo(countryCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: location.href,
      cookie: `localization=${countryCode}`,
      anonymous: true,
      onload: response => {
        resolve(response.responseText);
      },
      onerror: error => {
        reject(error);
      },
    });
  });
}

async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const cacheKey = `exchangeRate-${fromCurrency}-${toCurrency}`;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    return parseFloat(cached);
  }

  const url = `https://www.google.com/finance/quote/${fromCurrency}-${toCurrency}`;

  const html = await new Promise<string>((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      anonymous: true,
      onload: response => {
        resolve(response.responseText);
      },
      onerror: error => {
        reject(error);
      },
    });
  });

  const result = html.match(/data-last-price="(.+?)"/);
  if (!result || result.length < 2) {
    console.error(
      "Could not find exchange rate",
      fromCurrency,
      toCurrency,
      html,
    );
    return 0;
  }

  const rate = parseFloat(result[1]);
  sessionStorage.setItem(cacheKey, rate.toString());

  return rate;
}

function getCurrencyInfos(): CurrencyInfo[] {
  const rawCountries = document.querySelectorAll("#country_code option");
  const countries = Array.from(rawCountries)
    .map(element => {
      const text = (element as HTMLOptionElement).textContent ?? "";
      const result = text.match(/(.+)\((.+)\)/);
      if (!result || result.length < 3) return;

      const label = result[1];
      const currency = result[2];

      const currencyInfo: Country = {
        countryCode: (element as HTMLOptionElement).value,
        countryLabel: label,
        currencyLabel: currency.substring(0, 3),
      };

      return currencyInfo;
    })
    .filter(Boolean) as Array<Country>;

  const prices: CurrencyInfo[] = [];
  for (const country of countries) {
    const existing = prices.find(
      info => info.currencyLabel === country.currencyLabel,
    );
    if (existing) existing.countries.push(country);
    else
      prices.push({
        currencyLabel: country.currencyLabel,
        countries: [country],
      });
  }

  return prices;
}
