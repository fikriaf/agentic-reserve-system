import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';

export interface JupiterUltraOrder {
  orderId: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  slippageBps: number;
  fee: {
    amount: string;
    mint: string;
    pct: number;
  };
  routePlan: any[];
}

export interface JupiterUltraExecuteResponse {
  orderId: string;
  status: 'pending' | 'confirmed' | 'failed';
  txid?: string;
  inAmount: string;
  outAmount: string;
  error?: string;
}

export interface JupiterTokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  daily_volume?: number;
}

export interface JupiterPriceData {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

/**
 * Jupiter API Client
 * Supports Ultra API with authentication
 * API Documentation: https://station.jup.ag/docs/apis/ultra-api
 */
export class JupiterClient {
  private ultraClient: AxiosInstance;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 1000; // 30 seconds
  private readonly apiKey: string;

  constructor() {
    this.apiKey = config.apis.jupiterApiKey || '';
    
    // Ultra API client with authentication
    this.ultraClient = axios.create({
      baseURL: config.apis.jupiterUltraApiUrl || 'https://api.jup.ag',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
      },
    });

    if (this.apiKey) {
      console.log('✅ Jupiter client initialized with API key');
    } else {
      console.log('⚠️  Jupiter client initialized without API key (limited access)');
    }
  }

  /**
   * Get Ultra order (deprecated - use Jupiter Swap API or SDK instead)
   * This method is kept for backward compatibility but returns mock data
   */
  async getUltraOrder(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    slippageBps?: number;
    userPublicKey: string;
  }): Promise<JupiterUltraOrder> {
    console.warn('Jupiter Ultra API is not publicly available. Use Jupiter Swap API or SDK instead.');
    throw new Error('Jupiter Ultra API requires authentication. Use Jupiter Swap API or SDK instead.');
  }

  /**
   * Execute Ultra order (deprecated)
   */
  async executeUltraOrder(params: {
    orderId: string;
    signedTransaction: string;
  }): Promise<JupiterUltraExecuteResponse> {
    console.warn('Jupiter Ultra API is not publicly available. Use Jupiter Swap API or SDK instead.');
    throw new Error('Jupiter Ultra API requires authentication. Use Jupiter Swap API or SDK instead.');
  }

  /**
   * Get token price from Jupiter Price API V3
   * Uses /price/v3 endpoint with authentication
   */
  async getTokenPrice(mintAddress: string): Promise<number> {
    // Check cache
    const cached = this.priceCache.get(mintAddress);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.price;
    }

    if (!this.apiKey) {
      console.warn('Jupiter API key not configured. Returning mock price.');
      return this.getMockPrice(mintAddress);
    }

    try {
      const response = await this.ultraClient.get('/price/v3', {
        params: { ids: mintAddress },
      });

      // Response structure: { "mintAddress": { "usdPrice": 123.45, ... } }
      const priceData = response.data[mintAddress];
      if (!priceData || !priceData.usdPrice) {
        console.warn(`Price not found for ${mintAddress}, using mock price`);
        return this.getMockPrice(mintAddress);
      }

      const price = parseFloat(priceData.usdPrice);
      this.priceCache.set(mintAddress, { price, timestamp: Date.now() });

      return price;
    } catch (error) {
      console.error('Jupiter getTokenPrice error:', error);
      return this.getMockPrice(mintAddress);
    }
  }

  /**
   * Get mock price for common tokens
   */
  private getMockPrice(mintAddress: string): number {
    const mockPrices: Record<string, number> = {
      'So11111111111111111111111111111111111111112': 150.0, // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0,  // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.0,  // USDT
    };

    const price = mockPrices[mintAddress] || 0;
    this.priceCache.set(mintAddress, { price, timestamp: Date.now() });
    return price;
  }

  /**
   * Get multiple token prices from Jupiter Price API V3
   */
  async getTokenPrices(mintAddresses: string[]): Promise<Record<string, number>> {
    if (!this.apiKey) {
      console.warn('Jupiter API key not configured. Returning mock prices.');
      const prices: Record<string, number> = {};
      for (const mint of mintAddresses) {
        prices[mint] = this.getMockPrice(mint);
      }
      return prices;
    }

    try {
      const response = await this.ultraClient.get('/price/v3', {
        params: { ids: mintAddresses.join(',') },
      });

      const prices: Record<string, number> = {};
      
      for (const mint of mintAddresses) {
        const priceData = response.data[mint];
        if (priceData && priceData.usdPrice) {
          const price = parseFloat(priceData.usdPrice);
          prices[mint] = price;
          this.priceCache.set(mint, { price, timestamp: Date.now() });
        } else {
          prices[mint] = this.getMockPrice(mint);
        }
      }

      return prices;
    } catch (error) {
      console.error('Jupiter getTokenPrices error:', error);
      const prices: Record<string, number> = {};
      for (const mint of mintAddresses) {
        prices[mint] = this.getMockPrice(mint);
      }
      return prices;
    }
  }

  /**
   * Get token list from Jupiter Token List API
   * Endpoint: https://token.jup.ag/strict or https://token.jup.ag/all
   */
  async getTokenList(): Promise<JupiterTokenInfo[]> {
    try {
      // Try strict list first (verified tokens only)
      const response = await axios.get('https://token.jup.ag/strict', {
        timeout: 10000,
      });
      
      if (Array.isArray(response.data)) {
        return response.data;
      }
      
      console.warn('Jupiter Token List API returned unexpected format');
      return this.getMockTokenList();
    } catch (error) {
      console.error('Jupiter getTokenList error:', error);
      return this.getMockTokenList();
    }
  }

  /**
   * Get mock token list
   */
  private getMockTokenList(): JupiterTokenInfo[] {
    return [
      {
        address: 'So11111111111111111111111111111111111111112',
        name: 'Wrapped SOL',
        symbol: 'SOL',
        decimals: 9,
        logoURI: '',
        tags: ['verified'],
      },
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: '',
        tags: ['verified'],
      },
      {
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
        name: 'USDT',
        symbol: 'USDT',
        decimals: 6,
        logoURI: '',
        tags: ['verified'],
      },
    ];
  }

  /**
   * Get swap volume for a token pair (24h)
   */
  async getSwapVolume(inputMint: string, outputMint: string): Promise<number> {
    try {
      // Note: Jupiter doesn't have a direct volume API
      // This would need to be calculated from historical swap data
      // For now, return 0 as placeholder
      console.warn('Jupiter swap volume API not available, returning 0');
      return 0;
    } catch (error) {
      console.error('Jupiter getSwapVolume error:', error);
      return 0;
    }
  }

  /**
   * Calculate price impact (deprecated - use Jupiter Swap API)
   */
  async calculatePriceImpact(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
  }): Promise<number> {
    console.warn('Price impact calculation requires Jupiter Swap API or SDK');
    return 0;
  }

  /**
   * Get best route (deprecated - use Jupiter Swap API)
   */
  async getBestRoute(params: {
    inputMint: string;
    outputMint: string;
    amount: number;
    userPublicKey: string;
  }): Promise<any[]> {
    console.warn('Route calculation requires Jupiter Swap API or SDK');
    return [];
  }

  /**
   * Get user token holdings (deprecated - use Solana RPC)
   */
  async getUserHoldings(userPublicKey: string): Promise<any[]> {
    console.warn('User holdings require Solana RPC calls');
    return [];
  }

  /**
   * Search for tokens (use token list API instead)
   */
  async searchToken(query: string): Promise<JupiterTokenInfo[]> {
    try {
      const tokens = await this.getTokenList();
      const lowerQuery = query.toLowerCase();
      return tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(lowerQuery) ||
          token.name.toLowerCase().includes(lowerQuery) ||
          token.address.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Jupiter searchToken error:', error);
      return [];
    }
  }

  /**
   * Get SOL/USDC price
   */
  async getSOLUSDCPrice(): Promise<number> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.getTokenPrice(SOL_MINT);
  }

  /**
   * Get liquidity for a token pair (deprecated - use Jupiter Swap API)
   */
  async getLiquidity(
    inputMint: string,
    outputMint: string,
    userPublicKey: string
  ): Promise<{
    available: boolean;
    routes: number;
  }> {
    console.warn('Liquidity check requires Jupiter Swap API or SDK');
    return {
      available: false,
      routes: 0,
    };
  }

  /**
   * Get swap volume for a token (24h)
   * Note: Jupiter doesn't provide direct volume API
   * This would need to be calculated from historical data
   */
  async get24hVolume(mintAddress: string): Promise<number> {
    // Placeholder - would need historical swap data
    console.warn('Jupiter 24h volume API not available');
    return 0;
  }
}

// Singleton instance
let jupiterClient: JupiterClient | null = null;

/**
 * Get or create Jupiter client instance
 */
export function getJupiterClient(): JupiterClient {
  if (!jupiterClient) {
    jupiterClient = new JupiterClient();
  }
  return jupiterClient;
}
