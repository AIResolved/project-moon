FROM node:20-bullseye AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Build Next.js project (embed NEXT_PUBLIC_* at build time)
FROM node:20-bullseye AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=https://byktarizdjtreqwudqmv.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3Rhcml6ZGp0cmVxd3VkcW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDA0NTAsImV4cCI6MjA2MjcxNjQ1MH0.8SvctQWByvDXclXO48DDuMVLkO41sdjVO6vOvo5qsxc
RUN npm run build

# Production runner
FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["sh", "-c", "npm run start -- --port ${PORT:-8080} --hostname 0.0.0.0"]

