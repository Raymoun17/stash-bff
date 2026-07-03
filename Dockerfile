FROM node:24-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS source

COPY . .
RUN npx prisma generate

FROM source AS development

ENV NODE_ENV=development

CMD ["npm", "run", "dev"]

FROM source AS build

RUN npm run build

FROM source AS migrate

ENV NODE_ENV=production

CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS runtime

ENV NODE_ENV=production

RUN npm prune --omit=dev \
    && groupadd --system pwuser \
    && useradd --system --gid pwuser --create-home --home-dir /home/pwuser --shell /bin/bash pwuser \
    && chown -R pwuser:pwuser /app

USER pwuser

EXPOSE 3000

CMD ["npm", "start"]
