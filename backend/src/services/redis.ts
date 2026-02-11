import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType | null = null;
let redisConnected = false;
let connectionAttempted = false;

export async function getRedisClient(): Promise<RedisClientType | null> {
  // If already attempted and failed, return null immediately
  if (connectionAttempted && !redisConnected) {
    return null;
  }

  if (!redisClient && !connectionAttempted) {
    connectionAttempted = true;
    
    try {
      redisClient = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 5000, // 5 second timeout
          reconnectStrategy: false // Don't auto-reconnect
        }
      });

      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
        redisConnected = false;
      });

      // Try to connect with timeout
      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);
      
      redisConnected = true;
      console.log('✅ Redis connected successfully');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, continuing without cache:', error);
      redisClient = null;
      redisConnected = false;
      return null;
    }
  }
  
  return redisConnected ? redisClient : null;
}

// Export the client for health checks and direct access
export { redisClient };

export async function getCachedData<T>(
  key: string,
  ttl: number = 300
): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCachedData<T>(
  key: string,
  data: T,
  ttl: number = 300
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;
    
    await client.setEx(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Redis set error:', error);
  }
}
