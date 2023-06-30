# syntax=docker/dockerfile:1
FROM node:18-alpine AS builder

WORKDIR /app

RUN apk update && apk add git

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY . /app
RUN yarn --immutable
RUN yarn build


FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV LANG ja_JP.UTF-8

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

RUN yarn --immutable --production

EXPOSE 8080
ENV PORT 8080

CMD ["yarn", "start:prod"]
