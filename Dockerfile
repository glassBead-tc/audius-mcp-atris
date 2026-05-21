FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.6.5
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json .
COPY src ./src
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm@10.6.5
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
