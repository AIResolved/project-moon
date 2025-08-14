import crypto from 'crypto';

const API_KEY = process.env.STORYBLOCKS_PUBLIC_API_KEY;
const PRIVATE_KEY = process.env.STORYBLOCKS_PRIVATE_API_KEY;

export function isStoryblocksConfigured(): boolean {
  return !!API_KEY && !!PRIVATE_KEY;
}

export function getStoryblocksSearchUrl(queryParams: Record<string, string>): string {
  if (!API_KEY || !PRIVATE_KEY) {
    throw new Error('Storyblocks API keys are not configured.');
  }

  const resource = '/api/v2/audio/search';
  const expires = Math.floor(Date.now() / 1000) + 3600; // Expires in 1 hour

  const hmac = crypto.createHmac('sha256', PRIVATE_KEY + expires);
  hmac.update(resource);
  const signature = hmac.digest('hex');

  const defaultParams = {
    APIKEY: API_KEY,
    EXPIRES: expires.toString(),
    HMAC: signature,
    project_id: process.env.STORYBLOCKS_PROJECT_ID || 'test_project',
    user_id: process.env.STORYBLOCKS_USER_ID || 'test_user',
  };

  const allParams = { ...defaultParams, ...queryParams };

  const queryString = Object.entries(allParams)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
    
  return `https://api.storyblocks.com${resource}?${queryString}`;
} 