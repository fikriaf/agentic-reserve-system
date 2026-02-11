import axios, { AxiosInstance } from 'axios';
import { config } from '../../config';

export interface KaminoMarketData {
  address: string;
  name: string;
  totalSupply: number;
  totalBorrow: number;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  tvl: number;
}

export interface KaminoReserveData {
  mint: string;
  symbol: string;
  decimals: number;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: number;
  totalBorrow: number;
  availableLiquidity: number;
  utilizationRate: number;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
}

export interface KaminoMultiplyVault {
  address: string;
  name: string;
  collateralMint: string;
  debtMint: string;
  netAPY: number;
  leverage: number;
  tvl: number;
  collateralAPY: number;
  borrowAPY: number;
}

/**
 * Kamino Finance API Client
 * NOTE: Kamino does not have a public REST API. This client uses on-chain data via Solana RPC.
 * For production use, integrate the Kamino SDK: @kamino-finance/klend-sdk
 * This implementation returns mock data for development purposes.
 */
export class KaminoClient {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds

  constructor() {
    console.log('⚠️  Kamino client initialized (mock mode - no public REST API available)');
    console.log('ℹ️  For production, use @kamino-finance/klend-sdk with Solana RPC');
  }

  /**
   * Get all lending markets
   * NOTE: Returns mock data. For real data, use @kamino-finance/klend-sdk
   */
  async getMarkets(): Promise<KaminoMarketData[]> {
    const cacheKey = 'markets';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Mock data - Kamino Main Market
      const markets: KaminoMarketData[] = [
        {
          address: '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF', // Kamino Main Market
          name: 'Main Market',
          totalSupply: 1000000000,
          totalBorrow: 500000000,
          supplyAPY: 3.5,
          borrowAPY: 5.2,
          utilization: 50,
          tvl: 1000000000,
        },
      ];

      this.cache.set(cacheKey, { data: markets, timestamp: Date.now() });
      return markets;
    } catch (error) {
      console.error('Kamino getMarkets error:', error);
      return [];
    }
  }

  /**
   * Get specific market data (mock data)
   */
  async getMarket(marketAddress: string): Promise<KaminoMarketData> {
    try {
      const markets = await this.getMarkets();
      const market = markets.find((m) => m.address === marketAddress);
      
      if (!market) {
        throw new Error(`Market not found: ${marketAddress}`);
      }
      
      return market;
    } catch (error) {
      console.error('Kamino getMarket error:', error);
      throw new Error(`Failed to get Kamino market: ${error}`);
    }
  }

  /**
   * Get all reserves (assets) in a market (mock data)
   */
  async getReserves(marketAddress: string): Promise<KaminoReserveData[]> {
    const cacheKey = `reserves_${marketAddress}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Mock reserves data for Main Market
      const reserves: KaminoReserveData[] = [
        {
          mint: 'So11111111111111111111111111111111111111112', // SOL
          symbol: 'SOL',
          decimals: 9,
          supplyAPY: 3.2,
          borrowAPY: 5.1,
          totalSupply: 500000000,
          totalBorrow: 250000000,
          availableLiquidity: 250000000,
          utilizationRate: 50,
          ltv: 80,
          liquidationThreshold: 85,
          liquidationBonus: 5,
        },
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          symbol: 'USDC',
          decimals: 6,
          supplyAPY: 4.5,
          borrowAPY: 6.2,
          totalSupply: 300000000,
          totalBorrow: 150000000,
          availableLiquidity: 150000000,
          utilizationRate: 50,
          ltv: 85,
          liquidationThreshold: 90,
          liquidationBonus: 5,
        },
      ];

      this.cache.set(cacheKey, { data: reserves, timestamp: Date.now() });
      return reserves;
    } catch (error) {
      console.error('Kamino getReserves error:', error);
      return [];
    }
  }

  /**
   * Get specific reserve data
   */
  async getReserve(marketAddress: string, mint: string): Promise<KaminoReserveData> {
    try {
      const reserves = await this.getReserves(marketAddress);
      const reserve = reserves.find(r => r.mint === mint);

      if (!reserve) {
        throw new Error(`Reserve not found for mint: ${mint}`);
      }

      return reserve;
    } catch (error) {
      console.error('Kamino getReserve error:', error);
      throw new Error(`Failed to get Kamino reserve: ${error}`);
    }
  }

  /**
   * Get lending APY for a specific asset
   */
  async getLendingAPY(marketAddress: string, mint: string): Promise<number> {
    try {
      const reserve = await this.getReserve(marketAddress, mint);
      return reserve.supplyAPY;
    } catch (error) {
      console.error('Kamino getLendingAPY error:', error);
      return 0;
    }
  }

  /**
   * Get borrowing APY for a specific asset
   */
  async getBorrowingAPY(marketAddress: string, mint: string): Promise<number> {
    try {
      const reserve = await this.getReserve(marketAddress, mint);
      return reserve.borrowAPY;
    } catch (error) {
      console.error('Kamino getBorrowingAPY error:', error);
      return 0;
    }
  }

  /**
   * Get total TVL across all markets
   */
  async getTotalTVL(): Promise<number> {
    try {
      const markets = await this.getMarkets();
      const totalTVL = markets.reduce((sum, market) => sum + market.tvl, 0);
      return totalTVL;
    } catch (error) {
      console.error('Kamino getTotalTVL error:', error);
      return 0;
    }
  }

  /**
   * Get utilization rate for a specific asset
   */
  async getUtilizationRate(marketAddress: string, mint: string): Promise<number> {
    try {
      const reserve = await this.getReserve(marketAddress, mint);
      return reserve.utilizationRate;
    } catch (error) {
      console.error('Kamino getUtilizationRate error:', error);
      return 0;
    }
  }

  /**
   * Get all Multiply vaults (mock data)
   */
  async getMultiplyVaults(): Promise<KaminoMultiplyVault[]> {
    const cacheKey = 'multiply_vaults';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Mock Multiply vaults data
      const vaults: KaminoMultiplyVault[] = [
        {
          address: 'vault1',
          name: 'SOL Multiply',
          collateralMint: 'So11111111111111111111111111111111111111112',
          debtMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          netAPY: 12.5,
          leverage: 3.0,
          tvl: 50000000,
          collateralAPY: 5.2,
          borrowAPY: 6.1,
        },
      ];

      this.cache.set(cacheKey, { data: vaults, timestamp: Date.now() });
      return vaults;
    } catch (error) {
      console.error('Kamino getMultiplyVaults error:', error);
      return [];
    }
  }

  /**
   * Get specific Multiply vault (mock data)
   */
  async getMultiplyVault(vaultAddress: string): Promise<KaminoMultiplyVault> {
    try {
      const vaults = await this.getMultiplyVaults();
      const vault = vaults.find((v) => v.address === vaultAddress);
      
      if (!vault) {
        throw new Error(`Multiply vault not found: ${vaultAddress}`);
      }
      
      return vault;
    } catch (error) {
      console.error('Kamino getMultiplyVault error:', error);
      throw new Error(`Failed to get Multiply vault: ${error}`);
    }
  }

  /**
   * Get weighted average lending rate across all assets
   */
  async getWeightedAverageLendingRate(marketAddress: string): Promise<number> {
    try {
      const reserves = await this.getReserves(marketAddress);

      let totalWeightedAPY = 0;
      let totalTVL = 0;

      for (const reserve of reserves) {
        const tvl = reserve.totalSupply;
        totalWeightedAPY += reserve.supplyAPY * tvl;
        totalTVL += tvl;
      }

      return totalTVL > 0 ? totalWeightedAPY / totalTVL : 0;
    } catch (error) {
      console.error('Kamino getWeightedAverageLendingRate error:', error);
      return 0;
    }
  }

  /**
   * Get weighted average borrowing rate across all assets
   */
  async getWeightedAverageBorrowingRate(marketAddress: string): Promise<number> {
    try {
      const reserves = await this.getReserves(marketAddress);

      let totalWeightedAPY = 0;
      let totalBorrows = 0;

      for (const reserve of reserves) {
        const borrows = reserve.totalBorrow;
        totalWeightedAPY += reserve.borrowAPY * borrows;
        totalBorrows += borrows;
      }

      return totalBorrows > 0 ? totalWeightedAPY / totalBorrows : 0;
    } catch (error) {
      console.error('Kamino getWeightedAverageBorrowingRate error:', error);
      return 0;
    }
  }

  /**
   * Get SOL lending rate
   */
  async getSOLLendingRate(marketAddress: string): Promise<number> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.getLendingAPY(marketAddress, SOL_MINT);
  }

  /**
   * Get USDC lending rate
   */
  async getUSDCLendingRate(marketAddress: string): Promise<number> {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    return this.getLendingAPY(marketAddress, USDC_MINT);
  }

  /**
   * Get mSOL lending rate
   */
  async getMSOLLendingRate(marketAddress: string): Promise<number> {
    const MSOL_MINT = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So';
    return this.getLendingAPY(marketAddress, MSOL_MINT);
  }

  /**
   * Get top lending opportunities (highest APY)
   */
  async getTopLendingOpportunities(
    marketAddress: string,
    limit: number = 5
  ): Promise<KaminoReserveData[]> {
    try {
      const reserves = await this.getReserves(marketAddress);
      return reserves
        .sort((a, b) => b.supplyAPY - a.supplyAPY)
        .slice(0, limit);
    } catch (error) {
      console.error('Kamino getTopLendingOpportunities error:', error);
      return [];
    }
  }

  /**
   * Get market health metrics
   */
  async getMarketHealth(marketAddress: string): Promise<{
    totalSupply: number;
    totalBorrow: number;
    utilization: number;
    avgSupplyAPY: number;
    avgBorrowAPY: number;
  }> {
    try {
      const market = await this.getMarket(marketAddress);
      const avgSupplyAPY = await this.getWeightedAverageLendingRate(marketAddress);
      const avgBorrowAPY = await this.getWeightedAverageBorrowingRate(marketAddress);

      return {
        totalSupply: market.totalSupply,
        totalBorrow: market.totalBorrow,
        utilization: market.utilization,
        avgSupplyAPY,
        avgBorrowAPY,
      };
    } catch (error) {
      console.error('Kamino getMarketHealth error:', error);
      throw new Error(`Failed to get market health: ${error}`);
    }
  }
}

// Singleton instance
let kaminoClient: KaminoClient | null = null;

/**
 * Get or create Kamino client instance
 */
export function getKaminoClient(): KaminoClient {
  if (!kaminoClient) {
    kaminoClient = new KaminoClient();
  }
  return kaminoClient;
}
