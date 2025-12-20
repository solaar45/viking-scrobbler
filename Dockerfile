# === Frontend Build ===
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/app_web/package*.json ./
RUN npm install

COPY frontend/app_web/ ./
RUN npm run build

# === Backend Build ===
FROM hexpm/elixir:1.17.3-erlang-27.2-alpine-3.20.3 AS backend-build

RUN apk add --no-cache build-base git openssl-dev

ENV MIX_ENV=prod \
    LANG=C.UTF-8

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

COPY backend/app_api/mix.exs backend/app_api/mix.lock ./
RUN mix deps.get --only prod

COPY backend/app_api/config config
RUN mix deps.compile

COPY backend/app_api/lib lib
COPY backend/app_api/priv priv

# Frontend ins Backend kopieren
COPY --from=frontend-build /frontend/dist ./priv/static

RUN mix compile
RUN mix phx.digest
RUN mix release

# === Runtime ===
FROM alpine:3.20.3

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    ncurses-libs \
    libstdc++ \
    libgcc

ENV LANG=C.UTF-8 \
    MIX_ENV=prod

WORKDIR /app

COPY --from=backend-build /app/_build/prod/rel/app_api ./

# Entrypoint-Script kopieren
COPY backend/app_api/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN mkdir -p /app/data

ENV PHX_SERVER=true \
    PORT=4000 \
    DATABASE_PATH=/app/data/app_api.db

EXPOSE 4000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bin/app_api", "start"]
