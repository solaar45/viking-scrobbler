# === Build Stage ===
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

COPY index.html vite.config.* tsconfig*.json ./
COPY src src
COPY public public
COPY tailwind.config.* postcss.config.* ./

RUN npm run build

# === Runtime Stage ===
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
