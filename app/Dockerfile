FROM node:24-bookworm-slim
RUN corepack enable && apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_PATH=/data/throughline.db
EXPOSE 8080
CMD ["pnpm", "start"]
