# Deployment Guide

## Environment Variables Setup

### Required for all deployments:
```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-secure-random-secret-here
NEXTAUTH_URL=https://your-domain.com

# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional (for Google OAuth):
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Ngrok Setup

1. **Start your Next.js app:**
   ```bash
   cd content-generation
   npm run dev
   ```

2. **In another terminal, start ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Set environment variables for ngrok:**
   ```bash
   export NEXTAUTH_URL=https://your-ngrok-url.ngrok.app
   export NEXTAUTH_SECRET=your-secret-key-here
   ```

4. **Update Google OAuth settings:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to APIs & Services > Credentials
   - Add these redirect URIs:
     - `https://your-ngrok-url.ngrok.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`

## Production Deployment

### Vercel:
1. Set environment variables in Vercel dashboard
2. Ensure `NEXTAUTH_URL` matches your production domain
3. Update Google OAuth redirect URIs

### Other platforms:
1. Set all required environment variables
2. Ensure HTTPS is enabled
3. Update OAuth redirect URIs

## Troubleshooting

### 500 Error on /api/auth/session:
- ✅ Check NEXTAUTH_SECRET is set
- ✅ Verify NEXTAUTH_URL matches your domain
- ✅ Ensure Google OAuth credentials are correct
- ✅ Check redirect URIs in Google Console

### Debug page:
Visit `/auth/debug` to see current configuration and troubleshoot issues.

### Common Issues:
1. **Missing NEXTAUTH_SECRET**: Required for production
2. **Wrong NEXTAUTH_URL**: Must match exactly (including https://)
3. **OAuth redirect URI mismatch**: Must be added to Google Console
4. **Cookie issues**: Check domain settings for your deployment

## Security Notes:
- Always use HTTPS in production
- Keep NEXTAUTH_SECRET secure and unique
- Regularly rotate API keys
- Use environment-specific configurations 