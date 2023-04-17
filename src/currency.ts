/**
 * Get currencies and countries use same currencies from selectable options
 * @returns Array of currencies and countries use same currencies
 */
export function getCurrencies(): Currency[] {
  const countries = getCountries();

  const currencies: Currency[] = [];
  for (const country of countries) {
    const existing = currencies.find(
      currency => currency.currencyLabel === country.currencyLabel,
    );
    if (existing) existing.countries.push(country);
    else
      currencies.push({
        currencyLabel: country.currencyLabel,
        countries: [country],
      });
  }

  return currencies;
}

/**
 * Get countries and its currency from selectable options
 * @returns Array of countries and its currency
 * @throws Error if countries could not be found
 */
function getCountries(): Country[] {
  const rawCountries = document.querySelectorAll("#country_code option");
  if (!rawCountries || !rawCountries.length) {
    throw new Error("Could not find countries");
  }

  const countries = Array.from(rawCountries)
    .map(element => {
      const text = (element as HTMLOptionElement).textContent ?? "";
      const result = text.match(/(.+)\((.+)\)/);
      if (!result || result.length < 3) return;

      const label = result[1];
      const currency = result[2];

      const country: Country = {
        countryCode: (element as HTMLOptionElement).value,
        countryLabel: label,
        currencyLabel: currency.substring(0, 3),
      };

      return country;
    })
    .filter(Boolean) as Country[];

  return countries;
}

export interface Currency {
  currencyLabel: string;
  countries: Country[];
}

export interface Country {
  countryCode: string;
  countryLabel: string;
  currencyLabel: string;
}
