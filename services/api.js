// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfDay } from 'date-fns';
import {FINNHUB_API_KEY} from '@env';

// API Base URLs
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// --- Data Caching Logic ---
const getCachedData = async (key, fetcher) => {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        // Cache data for 15 minutes
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) { console.error('Error reading from cache:', error); }

    const data = await fetcher();
    
    if (data) {
        try {
          const item = { data, timestamp: Date.now() };
          await AsyncStorage.setItem(key, JSON.stringify(item));
        } catch (error) { console.error('Error writing to cache:', error); }
    }
    return data;
};

// --- Main Price Fetching Logic ---
export const fetchInvestmentPrices = async (investments) => {
    const cryptoSymbolToId = {
        'BTC': 'bitcoin', 'DOGE': 'dogecoin', 'ETH': 'ethereum',
        'SOL': 'solana', 'XRP': 'ripple',
    };

    const pricePromises = investments.map(async (investment) => {
        let quote;
        const quantity = parseFloat(investment.quantity);
        let currentValue = null;

        if (investment.api_symbol && !isNaN(quantity)) {
            if (investment.type === 'Stocks') {
                const symbol = investment.api_symbol.toUpperCase();
                const fetcher = async () => {
                  try {
                    const response = await fetch(`${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new Error(`Finnhub API error: ${response.status} - ${errorBody}`);
                    }
                    return await response.json();
                  } catch (error) {
                    console.error(`Failed to fetch stock quote for ${symbol}:`, error.message);
                    return null;
                  }
                };
                quote = await getCachedData(`stock_${symbol}`, fetcher);
                const currentPrice = quote ? quote.c : null;
                if (currentPrice !== null) {
                    currentValue = currentPrice * quantity;
                }
            } else if (investment.type === 'Crypto') {
                const coinId = cryptoSymbolToId[investment.api_symbol.toUpperCase()];
                if (coinId) {
                    const fetcher = async () => {
                      try {
                        const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${coinId}&vs_currencies=inr`);
                        if (!response.ok) {
                            const errorBody = await response.text();
                            throw new Error(`CoinGecko API error: ${response.status} - ${errorBody}`);
                        }
                        return await response.json();
                      } catch (error) {
                        console.error(`Failed to fetch crypto quote for ${investment.api_symbol}:`, error.message);
                        return null;
                      }
                    };
                    quote = await getCachedData(`crypto_${coinId}`, fetcher);
                    const priceInr = quote && quote[coinId] ? quote[coinId].inr : null;
                    if (priceInr !== null) {
                        currentValue = priceInr * quantity;
                    }
                }
            }
        }

        if (currentValue === null) {
            return { ...investment, currentValue: parseFloat(investment.total_cost || 0) };
        }

        return { ...investment, currentValue };
    });
    return Promise.all(pricePromises);
};


// --- Symbol Search for Stocks ---
export const searchStockSymbol = async (query) => {
    if (!query || query.length < 2) return [];
    try {
        const response = await fetch(`${FINNHUB_BASE_URL}/search?q=${query}&token=${FINNHUB_API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch symbols');
        const data = await response.json();
        return data.result.filter(item => !item.symbol.includes('.') && (item.type === "Common Stock" || item.type === "")).slice(0, 10);
    } catch (error) {
        console.error("Symbol search failed:", error);
        return [];
    }
};
