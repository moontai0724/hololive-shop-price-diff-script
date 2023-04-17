import { Currency } from "./currency";

interface PriceInfo {
  price: string;
  localPrice: number;
  currencyInfo: Currency;
}

interface Product {
  index: number;
  name: string;
  prices: Array<PriceInfo>;
}
