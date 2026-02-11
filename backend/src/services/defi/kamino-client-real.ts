import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket, KaminoReserve } from '@kamino-finance/klend-sdk';
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

/**
 * Kamino Finance SDK Client
 * Uses @kamino-finance/klend-sdk for real on-chain data
 */
export class KaminoClientReal {
  private connection: Connection;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds
  
  // Kamino Main Market address
  private readonly MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    console.log('✅ Kamino SDK client initialized with Solana RPC');
  }

  /**
   * Get Kamino market data
   */
  async getMarket(marketAddress?: string): Promise<KaminoMarketData> {
    const cacheKey = `market_${marketAddress || 'main'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const marketPubkey = marketAddress 
        ? new PublicKey(marketAddress) 
        : this.MAIN_MARKET;

      const market = await KaminoMarket.load(
        this.connection,
        marketPubkey
      );

      if (!market) {
        throw new Error('Failed to load Kamino market');
      }

      // Calculate market metrics
      let totalSupply = 0;
      let totalBorrow = 0;
      let weightedSupplyAPY = 0;
      let weightedBorrowAPY = 0;

      for (const reserve of market.reserves) {
        const supplyValue = reserve.getTotalSupply().toNumber();
        const borrowValue = reserve.getBorrowedAmount().toNumber();
        
        totalSupply += supplyValue;
        totalBorrow += borrowValue;
        
        const supplyAPY = reserve.totalSupplyAPY().toNumber();
        const borrowAPY = reserve.totalBorrowAPY().toNumber();
        
        weightedSupplyAPY += supplyAPY * supplyValue;
        weightedBorrowAPY += borrowAPY * borrowValue;
      }

      const avgSupplyAPY = totalSupply > 0 ? weightedSupplyAPY / totalSupply : 0;
      const avgBorrowAPY = totalBorrow > 0 ? weightedBorrowAPY / totalBorrow : 0;
      const utilization = totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0;

      const marketData: KaminoMarketData = {
        address: marketPubkey.toString(),
        name: 'Main Market',
        totalSupply,
        totalBorrow,
        supplyAPY: avgSupplyAPY,
        borrowAPY: avgBorrowAPY,
        utilization,
        tvl: totalSupply,
      };

      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      return marketData;
    } catch (error) {
      console.error('Kamino getMarket error:', error);
      throw new Error(`Failed to get Kamino market: ${error}`);
    }
  }

  /**
   * Get all reserves in a market
   */
  async getReserves(marketAddress?: string): Promise<KaminoReserveData[]> {
    const cacheKey = `reserves_${marketAddress || 'main'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const marketPubkey = marketAddress 
        ? new PublicKey(marketAddress) 
        : this.MAIN_MARKET;

      const market = await KaminoMarket.load(
        this.connection,
        marketPubkey
      );

      if (!market) {
        throw new Error('Failed to load Kamino market');
      }

      const reserves: KaminoReserveData[] = [];

      for (const reserve of market.reserves) {
        const mint = reserve.getLiquidityMint();
        const symbol = reserve.symbol || 'UNKNOWN';
        const decimals = reserve.stats.decimals;
        
        const supplyAPY = reserve.totalSupplyAPY().toNumber();
        const borrowAPY = reserve.totalBorrowAPY().toNumber();
        
        const totalSupply = reserve.getTotalSupply().toNumber();
        const totalBorrow = reserve.getBorrowedAmount().toNumber();
        const availableLiquidity = reserve.getAvailableAmount().toNumber();
        
        const utilizationRate = totalSupply > 0 
          ? (totalBorrow / totalSupply) * 100 
          : 0;

        const ltv = reserve.config.loanToValuePct;
        const liquidationThreshold = reserve.config.liquidationThresholdPct;
        const liquidationBonus = reserve.config.liquidationBonusPct;

        reserves.push({
          mint: mint.toString(),
          symbol,
          decimals,
          supplyAPY,
          borrowAPY,
          totalSupply,
          totalBorrow,
          availableLiquidity,
          utilizationRate,
          ltv,
          liquidationThreshold,
          liquidationBonus,
        });
      }

      this.cache.set(cacheKey, { data: reserves, timestamp: Date.now() });
      return reserves;
    } catch (error) {
      console.error('Kamino getReserves error:', error);
      return [];
    }
  }

  /**
   * Get specific reserve by mint
   */
  async getReserve(mint: string, marketAddress?: string): Promise<KaminoReserveData | null> {
    try {
      const reserves = await this.getReserves(marketAddress);
      return reserves.find(r => r.mint === mint) || null;
    } catch (error) {
      console.error('Kamino getReserve error:', error);
      return null;
    }
  }

  /**
   * Get lending APY for a specific asset
   */
  async getLendingAPY(mint: string, marketAddress?: string): Promise<number> {
    try {
      const reserve = await this.getReserve(mint, marketAddress);
      return reserve?.supplyAPY || 0;
    } catch (error) {
      console.error('Kamino getLendingAPY error:', error);
      return 0;
    }
  }

  /**
   * Get borrowing APY for a specific asset
   */
  async getBorrowingAPY(mint: string, marketAddress?: string): Promise<number> {
    try {
      const reserve = await this.getReserve(mint, marketAddress);
      return reserve?.borrowAPY || 0;
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
      const market = await this.getMarket();
      return market.tvl;
    } catch (error) {
      console.error('Kamino getTotalTVL error:', error);
      return 0;
    }
  }

  /**
   * Get SOL lending rate
   */
  async getSOLLendingRate(marketAddress?: string): Promise<number> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.getLendingAPY(SOL_MINT, marketAddress);
  }

  /**
   * Get USDC lending rate
   */
  async getUSDCLendingRate(marketAddress?: string): Promise<number> {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    return this.getLendingAPY(USDC_MINT, marketAddress);
  }

  /**
   * Get weighted average lending rate
   */
  async getWeightedAverageLendingRate(marketAddress?: string): Promise<number> {
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
}

// Singleton instance
let kaminoClientReal: KaminoClientReal | null = null;

/**
 * Get or create Kamino SDK client instance
 */
export function getKaminoClientReal(): KaminoClientReal {
  if (!kaminoClientReal) {
    kaminoClientReal = new KaminoClientReal();
  }
  return kaminoClientReal;
}
