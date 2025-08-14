FROM node:20-bullseye AS base
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env .env


RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder /app .
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs
USER nextjs
EXPOSE 3000
CMD ["npm", "run", "start"]
