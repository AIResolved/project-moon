FROM node:20-bullseye AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build Next.js project without secrets baked in
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Set build-time environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=https://byktarizdjtreqwudqmv.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5a3Rhcml6ZGp0cmVxd3VkcW12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDA0NTAsImV4cCI6MjA2MjcxNjQ1MH0.8SvctQWByvDXclXO48DDuMVLkO41sdjVO6vOvo5qsxc

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000

# Copy build artifacts
COPY --from=builder /app ./

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs
USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]

