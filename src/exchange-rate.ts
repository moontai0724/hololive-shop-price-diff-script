/**
 * Get the exchange rate from one currency to another
 * @param from From what currency to convert
 * @param to Convert to what currency
 * @returns The exchange rate
 */
export async function getExchangeRate(
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return 1;

  const cached = getCachedExchangeRate(from, to);
  if (cached) return cached;

  const url = `https://www.google.com/finance/quote/${from}-${to}`;
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
    console.error("Could not find exchange rate", from, to, html);
    return 0;
  }

  const rate = parseFloat(result[1]);
  setCachedExchangeRate(from, to, rate);

  return rate;
}

function getCachedExchangeRate(from: string, to: string): number {
  const cache = GM_getValue(
    "exchangeRate",
    {} as Record<string, ExchangeRateCache>,
  );
  const key = `${from}-${to}`;
  const cached = cache[key];

  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60) {
    return cached.rate;
  }

  return 0;
}

function setCachedExchangeRate(from: string, to: string, rate: number) {
  const cache = GM_getValue(
    "exchangeRate",
    {} as Record<string, ExchangeRateCache>,
  );
  const key = `${from}-${to}`;
  cache[key] = {
    from,
    to,
    rate,
    timestamp: Date.now(),
  };
  GM_setValue("exchangeRate", cache);
}

interface ExchangeRateCache {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}
