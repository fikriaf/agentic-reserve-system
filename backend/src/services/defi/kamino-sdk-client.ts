import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket } from '@kamino-finance/klend-sdk';
import { config } from '../../config';
import { createSolanaRpc, address } from '@solana/kit';
import Decimal from 'decimal.js';

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
 * Uses @kamino-finance/klend-sdk v7.3.18 for REAL on-chain data
 * NO MOCK DATA!
 */
export class KaminoSDKClient {
  private connection: Connection;
  private rpc: any; // Solana Kit RPC
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 60 seconds
  private readonly RECENT_SLOT_DURATION_MS = 400; // 400ms per slot (Solana average)
  
  // Kamino Main Market addresses
  private readonly MAINNET_MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF';
  private readonly DEVNET_MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF'; // Use mainnet for now
  private readonly PROGRAM_ID = 'KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD';

  constructor() {
    // Check if we're on devnet or mainnet
    const isDevnet = config.solana.network === 'devnet' || config.solana.rpcUrl.includes('devnet');
    
    if (isDevnet) {
      console.warn('⚠️  Kamino SDK: Devnet detected but using Mainnet RPC for real data');
      console.warn('   Kamino protocol is primarily on Mainnet');
      // Use mainnet RPC for Kamino data
      this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      this.rpc = createSolanaRpc('https://api.mainnet-beta.solana.com');
    } else {
      this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
      this.rpc = createSolanaRpc(config.solana.rpcUrl);
    }
    
    console.log('✅ Kamino SDK client initialized (REAL DATA - NO MOCK)');
    console.log(`   RPC: ${isDevnet ? 'https://api.mainnet-beta.solana.com' : config.solana.rpcUrl}`);
    console.log(`   Network: mainnet-beta (Kamino is on Mainnet)`);
  }

  /**
   * Get current slot for APY calculations
   */
  private async getCurrentSlot(): Promise<bigint> {
    try {
      const slot = await this.rpc.getSlot().send();
      return slot;
    } catch (error) {
      console.error('Error getting current slot:', error);
      return BigInt(0);
    }
  }

  /**
   * Get Kamino market data with all reserves - REAL DATA
   */
  async getMarket(marketAddress?: string): Promise<KaminoMarketData> {
    const cacheKey = `market_${marketAddress || 'main'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const marketAddr = address(marketAddress || this.MAINNET_MARKET);
      const programId = address(this.PROGRAM_ID);

      // Load market with SDK v7.3.18 - REAL ON-CHAIN DATA
      const market = await KaminoMarket.load(
        this.rpc,
        marketAddr,
        this.RECENT_SLOT_DURATION_MS,
        programId,
        true // withReserves
      );

      if (!market) {
        throw new Error('Failed to load Kamino market from blockchain');
      }

      const currentSlot = await this.getCurrentSlot();

      // Calculate market metrics from REAL reserves
      const reserves = market.getReserves();
      
      let totalSupplyUsd = 0;
      let totalBorrowUsd = 0;
      let weightedSupplyAPY = 0;
      let weightedBorrowAPY = 0;

      for (const reserve of reserves) {
        // Get REAL TVL from on-chain data
        const depositTvl = reserve.getDepositTvl();
        const borrowTvl = reserve.getBorrowTvl();
        
        const supplyUsd = depositTvl.toNumber();
        const borrowUsd = borrowTvl.toNumber();
        
        totalSupplyUsd += supplyUsd;
        totalBorrowUsd += borrowUsd;
        
        // Get REAL APY from on-chain calculations
        const supplyAPY = reserve.totalSupplyAPY(currentSlot);
        const borrowAPY = reserve.totalBorrowAPY(currentSlot);
        
        weightedSupplyAPY += supplyAPY * supplyUsd;
        weightedBorrowAPY += borrowAPY * borrowUsd;
      }

      const avgSupplyAPY = totalSupplyUsd > 0 ? weightedSupplyAPY / totalSupplyUsd : 0;
      const avgBorrowAPY = totalBorrowUsd > 0 ? weightedBorrowAPY / totalBorrowUsd : 0;
      const utilization = totalSupplyUsd > 0 ? (totalBorrowUsd / totalSupplyUsd) * 100 : 0;

      const marketData: KaminoMarketData = {
        address: marketAddr.toString(),
        name: market.getName() || 'Main Market',
        totalSupply: totalSupplyUsd,
        totalBorrow: totalBorrowUsd,
        supplyAPY: avgSupplyAPY,
        borrowAPY: avgBorrowAPY,
        utilization,
        tvl: totalSupplyUsd,
      };

      this.cache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      return marketData;
    } catch (error: any) {
      console.error('Kamino getMarket error:', error.message);
      throw new Error(`Failed to get Kamino market: ${error.message}`);
    }
  }

  /**
   * Get all reserves in a market - REAL DATA
   */
  async getReserves(marketAddress?: string): Promise<KaminoReserveData[]> {
    const cacheKey = `reserves_${marketAddress || 'main'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const marketAddr = address(marketAddress || this.MAINNET_MARKET);
      const programId = address(this.PROGRAM_ID);

      const market = await KaminoMarket.load(
        this.rpc,
        marketAddr,
        this.RECENT_SLOT_DURATION_MS,
        programId,
        true
      );

      if (!market) {
        throw new Error('Failed to load Kamino market from blockchain');
      }

      const currentSlot = await this.getCurrentSlot();
      const reserves: KaminoReserveData[] = [];
      const kaminoReserves = market.getReserves();

      for (const reserve of kaminoReserves) {
        const stats = reserve.stats;
        const config = reserve.state.config;
        
        // Get mint address
        const mint = reserve.getLiquidityMint().toString();
        
        // Get symbol from stats
        const symbol = stats.symbol || mint.substring(0, 8);
        const decimals = stats.decimals;
        
        // REAL APY from on-chain calculations
        const supplyAPY = reserve.totalSupplyAPY(currentSlot);
        const borrowAPY = reserve.totalBorrowAPY(currentSlot);
        
        // REAL TVL from on-chain data
        const depositTvl = reserve.getDepositTvl();
        const borrowTvl = reserve.getBorrowTvl();
        
        const totalSupply = depositTvl.toNumber();
        const totalBorrow = borrowTvl.toNumber();
        const availableLiquidity = totalSupply - totalBorrow;
        
        const utilizationRate = totalSupply > 0 
          ? (totalBorrow / totalSupply) * 100 
          : 0;

        // LTV and liquidation parameters from on-chain config
        const ltv = stats.loanToValue;
        const liquidationThreshold = stats.liquidationThreshold;
        const liquidationBonus = stats.maxLiquidationBonus;

        reserves.push({
          mint,
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
    } catch (error: any) {
      console.error('Kamino getReserves error:', error.message);
      return [];
    }
  }

  /**
   * Get specific reserve by mint - REAL DATA
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
   * Get lending APY for a specific asset - REAL DATA
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
   * Get borrowing APY for a specific asset - REAL DATA
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
   * Get total TVL across all markets - REAL DATA
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
   * Get SOL lending rate - REAL DATA
   */
  async getSOLLendingRate(marketAddress?: string): Promise<number> {
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    return this.getLendingAPY(SOL_MINT, marketAddress);
  }

  /**
   * Get USDC lending rate - REAL DATA
   */
  async getUSDCLendingRate(marketAddress?: string): Promise<number> {
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    return this.getLendingAPY(USDC_MINT, marketAddress);
  }

  /**
   * Get weighted average lending rate - REAL DATA
   */
  async getWeightedAverageLendingRate(marketAddress?: string): Promise<number> {
    try {
      const market = await this.getMarket(marketAddress);
      return market.supplyAPY;
    } catch (error) {
      console.error('Kamino getWeightedAverageLendingRate error:', error);
      return 0;
    }
  }
}

// Singleton instance
let kaminoSDKClient: KaminoSDKClient | null = null;

/**
 * Get or create Kamino SDK client instance
 * Returns REAL on-chain data - NO MOCK DATA!
 */
export function getKaminoSDKClient(): KaminoSDKClient {
  if (!kaminoSDKClient) {
    kaminoSDKClient = new KaminoSDKClient();
  }
  return kaminoSDKClient;
}
