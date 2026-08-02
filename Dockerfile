FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY config ./config

RUN npm ci
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV CRON_REQUIRE_SECRET=true
ENV PORT=8080

WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home /app app

COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/package-lock.json ./package-lock.json
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/config ./config

RUN mkdir -p /app/data /app/.cache/sources && chown -R app:app /app/data /app/.cache

USER app

EXPOSE 8080

CMD ["npm", "run", "start:cron:serve", "--", "--port=8080"]
