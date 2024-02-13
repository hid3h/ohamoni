# syntax=docker/dockerfile:1
FROM node:18-alpine AS builder

WORKDIR /app

RUN apk update && apk add git

ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY . /app
RUN yarn --immutable
RUN yarn prisma:generate

RUN yarn build
RUN yarn build:css


FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV LANG ja_JP.UTF-8

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

COPY --from=builder /app/views ./views

RUN yarn --immutable --production

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 8080
ENV PORT 8080

CMD ["yarn", "start:prod"]
