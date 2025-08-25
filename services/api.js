// services/api.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FINNHUB_API_KEY } from "@env";

// API Base URLs
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

// --- Data Caching Logic ---
const getCachedData = async (key, fetcher, cacheDuration = 15 * 60 * 1000) => {
  try {
    const cachedItem = await AsyncStorage.getItem(key);
    if (cachedItem) {
      const { data, timestamp } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < cacheDuration) {
        return data;
      }
    }
  } catch (error) {
    console.error("Error reading from cache:", error);
  }

  const data = await fetcher();

  if (data) {
    try {
      const itemToCache = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(key, JSON.stringify(itemToCache));
    } catch (error) {
      console.error("Error writing to cache:", error);
    }
  }
  return data;
};

// --- API Fetching Helpers ---
const fetchApiData = async (url, serviceName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `${serviceName} API error: ${response.status} - ${errorBody}`
      );
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from ${serviceName}:`, error.message);
    return null;
  }
};

// --- Investment-specific Value Calculators ---
const calculateFDValue = (investment) => {
  const { total_cost: principal, purchase_price: rate, date } = investment;
  const startDate = new Date(date);

  if (principal > 0 && rate > 0 && !isNaN(startDate.getTime())) {
    const now = new Date();
    const diffTime = now - startDate;
    const yearsElapsed = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsElapsed > 0) {
      const interest = principal * (rate / 100) * yearsElapsed;
      return principal + interest;
    }
  }
  return null;
};

const calculateStockValue = async (investment) => {
  const { api_symbol, quantity } = investment;
  const symbol = api_symbol.toUpperCase();

  const fetcher = () =>
    fetchApiData(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
      "Finnhub"
    );

  const quote = await getCachedData(`stock_${symbol}`, fetcher);
  const currentPrice = quote?.c;

  return currentPrice !== null && currentPrice !== undefined
    ? currentPrice * quantity
    : null;
};

const calculateCryptoValue = async (investment) => {
  const cryptoSymbolToId = {
    BTC: "bitcoin",
    DOGE: "dogecoin",
    ETH: "ethereum",
    SOL: "solana",
    XRP: "ripple",
  };
  const { api_symbol, quantity } = investment;
  const coinId = cryptoSymbolToId[api_symbol.toUpperCase()];

  if (!coinId) return null;

  const fetcher = () =>
    fetchApiData(
      `${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=inr`,
      "CoinGecko"
    );

  const quote = await getCachedData(`crypto_${coinId}`, fetcher);
  const priceInr = quote?.[coinId]?.inr;

  return priceInr !== null && priceInr !== undefined
    ? priceInr * quantity
    : null;
};

// --- Main Price Fetching Logic ---
export const fetchInvestmentPrices = async (investments) => {
  const pricePromises = investments.map(async (investment) => {
    let currentValue = null;

    if (investment.type === "FD") {
      currentValue = calculateFDValue(investment);
    } else if (investment.api_symbol && investment.quantity > 0) {
      if (investment.type === "Stocks") {
        currentValue = await calculateStockValue(investment);
      } else if (investment.type === "Crypto") {
        currentValue = await calculateCryptoValue(investment);
      }
    }

    return {
      ...investment,
      currentValue: currentValue ?? investment.total_cost ?? 0,
    };
  });

  return Promise.all(pricePromises);
};

// --- Symbol Search for Stocks ---
export const searchStockSymbol = async (query) => {
  if (!query || query.length < 2) return [];

  const url = `${FINNHUB_BASE_URL}/search?q=${query}&token=${FINNHUB_API_KEY}`;
  const data = await fetchApiData(url, "Finnhub Search");

  if (data?.result) {
    return data.result
      .filter(
        (item) =>
          !item.symbol.includes(".") &&
          (item.type === "Common Stock" || item.type === "")
      )
      .slice(0, 10);
  }
  return [];
};
