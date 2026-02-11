import { Redis } from '@upstash/redis';
import { config } from '../config';

let upstashClient: Redis | null = null;

/**
 * Get Upstash Redis client
 * Uses REST API instead of TCP connection
 */
export function getUpstashRedis(): Redis | null {
  if (!upstashClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn('⚠️ Upstash Redis credentials not configured');
      return null;
    }

    try {
      upstashClient = new Redis({
        url,
        token,
      });
      console.log('✅ Upstash Redis client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Upstash Redis:', error);
      return null;
    }
  }

  return upstashClient;
}

/**
 * Get cached data from Upstash Redis
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const client = getUpstashRedis();
    if (!client) return null;

    const data = await client.get<string>(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Upstash Redis get error:', error);
    return null;
  }
}

/**
 * Set cached data in Upstash Redis
 */
export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<void> {
  try {
    const client = getUpstashRedis();
    if (!client) return;

    await client.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Upstash Redis set error:', error);
  }
}

/**
 * Delete cached data from Upstash Redis
 */
export async function deleteCachedData(key: string): Promise<void> {
  try {
    const client = getUpstashRedis();
    if (!client) return;

    await client.del(key);
  } catch (error) {
    console.error('Upstash Redis delete error:', error);
  }
}

export { upstashClient };
