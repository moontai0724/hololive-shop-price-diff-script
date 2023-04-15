interface Country {
  countryCode: string;
  countryLabel: string;
  currencyLabel: string;
}

interface CurrencyInfo {
  currencyLabel: string;
  countries: Array<Country>;
}

interface PriceInfo {
  price: string;
  localPrice: number;
  currencyInfo: CurrencyInfo;
}

interface Product {
  index: number;
  name: string;
  prices: Array<PriceInfo>;
}
