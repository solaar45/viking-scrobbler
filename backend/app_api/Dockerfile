# === Build Stage ===
FROM hexpm/elixir:1.17.3-erlang-27.2-alpine-3.20.3 AS build

RUN apk add --no-cache build-base git openssl-dev

ENV MIX_ENV=prod \
    LANG=C.UTF-8

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

COPY mix.exs mix.lock ./
RUN mix deps.get --only prod

COPY config config
RUN mix deps.compile

COPY lib lib
COPY priv priv

RUN mix compile
RUN mix release

# === Runtime Stage ===
FROM alpine:3.20.3 AS app

RUN apk add --no-cache \
    openssl \
    openssl-dev \
    ncurses-libs \
    libstdc++ \
    libgcc

ENV LANG=C.UTF-8 \
    MIX_ENV=prod

WORKDIR /app

COPY --from=build /app/_build/prod/rel/app_api ./

RUN mkdir -p /app/data

ENV PHX_SERVER=true \
    PORT=4000 \
    DATABASE_PATH=/app/data/app_api.db

EXPOSE 4000

CMD ["bin/app_api", "start"]
