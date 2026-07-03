FROM mcr.microsoft.com/playwright:v1.61.1-noble AS dependencies

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

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

RUN npm prune --omit=dev

USER pwuser

EXPOSE 3000

CMD ["npm", "start"]
