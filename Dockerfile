#############################
# STAGE 1: Flat-Frontend bauen
#############################
FROM node:20-alpine AS flat-builder
WORKDIR /build

# Dependencies installieren
COPY frontend/package*.json ./
RUN npm install

# Source-Code kopieren
COPY frontend/ .

# Vite-Build → erzeugt dist/index.html + assets/*
RUN npm run build

# Pfade in dist/index.html von "/assets/" auf "/themes/flat/assets/" umschreiben
# So zeigen alle gebauten Skripte/Styles direkt auf den Phoenix-Static-Pfad
RUN sed -i 's|"/assets/|"/themes/flat/assets/|g' dist/index.html

#############################
# STAGE 2: Phoenix-Backend + Assets
#############################
FROM elixir:1.16-alpine AS backend-builder
WORKDIR /app

RUN apk add --no-cache build-base git
ENV MIX_ENV=prod
RUN mix local.hex --force && mix local.rebar --force

# Backend-Dependencies
COPY backend/mix.exs backend/mix.lock ./
RUN mix deps.get --only $MIX_ENV && mix deps.compile

# Backend-Code
COPY backend/config config/
COPY backend/lib lib/
COPY backend/priv priv/

# Frontend-Assets ins Phoenix-priv kopieren
COPY --from=flat-builder /build/dist /app/priv/static/themes/flat_raw

# ZUERST: themes/flat_raw nach priv/static/themes/flat kopieren
RUN mkdir -p priv/static/themes/flat && \
    cp -a priv/static/themes/flat_raw/* priv/static/themes/flat/

# Dann phx.digest über GANZES priv/static laufen lassen
RUN mix phx.digest priv/static

RUN mix release

#############################
# STAGE 3: Runtime-Image
#############################
FROM alpine:3.19
RUN apk add --no-cache libstdc++ ncurses-libs openssl
WORKDIR /app

# Release aus vorherigem Stage
COPY --from=backend-builder /app/_build/prod/rel/app_api .

# Entrypoint für SECRET_KEY_BASE + DB-Path
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV PHX_SERVER=true
ENV PORT=4000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["bin/app_api", "start"]