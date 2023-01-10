FROM node:16.17.0-alpine AS build
WORKDIR /app

# JS BUILD
COPY package.json yarn.lock tsconfig.json ./
COPY src src
RUN yarn --ignore-scripts && \
    yarn build-minimal

FROM node:16.17.0-alpine
WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY config config
COPY test/datasources-test test/datasources-test
COPY package.json yarn.lock ./
# TODO install only production dependencies after (re)moving data source availability check test
RUN yarn --ignore-scripts --cache-folder .yarn-cache && \
    rm -rf .yarn-cache

# FAKETIME
# USER root
RUN apk add --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing/ libfaketime && \
    rm -rf /var/cache/apk/*

# Create a non-root user
RUN addgroup -S nonroot && \
    adduser -S nonroot -G nonroot -h /app -u 1001 -D && \
    chown -R nonroot /app
USER nonroot

EXPOSE 3006
CMD ["node", "-r",  "dotenv/config", "dist/index.js"]

# For FAKETIME use prefix like:
# LD_PRELOAD=/usr/local/lib/libfaketime.so.1 FAKETIME="@2022-02-22 20:22:00" date
# LD_PRELOAD=/usr/local/lib/libfaketime.so.1 FAKETIME="@2022-02-22 20:22:00" yarn start
