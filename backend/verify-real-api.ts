/**
 * Verify if Jupiter API is returning REAL data or MOCK data
 */

import { getJupiterClient } from './src/services/defi/jupiter-client';

async function verifyRealAPI() {
  console.log('🔍 Verifying Jupiter API - Real vs Mock Data\n');
  console.log('='.repeat(60));
  
  const client = getJupiterClient();
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  // Mock price in code is $150
  const MOCK_PRICE = 150.0;
  
  console.log('\n📊 Testing SOL Price:');
  console.log(`Expected MOCK price: $${MOCK_PRICE}`);
  
  try {
    const price = await client.getTokenPrice(SOL_MINT);
    console.log(`Received price: $${price}`);
    
    if (price === MOCK_PRICE) {
      console.log('\n❌ USING MOCK DATA!');
      console.log('Reason: API key might be invalid or API is not responding');
    } else {
      console.log('\n✅ USING REAL API DATA!');
      console.log(`Price difference: $${Math.abs(price - MOCK_PRICE).toFixed(2)}`);
      console.log('Jupiter API is working correctly with real-time data');
    }
    
    // Test multiple times to check consistency
    console.log('\n📊 Testing consistency (3 calls):');
    const prices: number[] = [];
    for (let i = 0; i < 3; i++) {
      const p = await client.getTokenPrice(SOL_MINT);
      prices.push(p);
      console.log(`  Call ${i + 1}: $${p}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const allSame = prices.every(p => p === prices[0]);
    if (allSame && prices[0] === MOCK_PRICE) {
      console.log('\n❌ All prices are MOCK ($150) - API not working');
    } else if (allSame) {
      console.log('\n✅ Consistent real prices (cached)');
    } else {
      console.log('\n✅ Prices vary slightly (real-time data)');
    }
    
  } catch (error: any) {
    console.log('\n❌ ERROR:', error.message);
  }
  
  // Test with unknown token
  console.log('\n📊 Testing unknown token (should return 0 or mock):');
  try {
    const unknownMint = 'UnknownToken1111111111111111111111111111111';
    const price = await client.getTokenPrice(unknownMint);
    console.log(`Unknown token price: $${price}`);
    if (price === 0) {
      console.log('✅ Correctly returns 0 for unknown tokens');
    }
  } catch (error: any) {
    console.log('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('- Mock SOL price in code: $150');
  console.log('- If you see ~$80-100: ✅ Real API working');
  console.log('- If you see exactly $150: ❌ Using mock data');
  console.log('- Mock data is only used as FALLBACK when API fails');
}

verifyRealAPI().catch(console.error);
