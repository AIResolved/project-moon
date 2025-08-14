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

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

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

