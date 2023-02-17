FROM node:18.14.0-alpine AS build
WORKDIR /app

# JS BUILD
COPY .npmrc package.json package-lock.json tsconfig.json ./
COPY src src
RUN npm install --ignore-scripts --progress=false && \
    npm run build-minimal

FROM node:18.14.0-alpine
WORKDIR /app

COPY --from=build /app/dist /app/dist
COPY config config
COPY test/datasources-test test/datasources-test
COPY .npmrc package.json package-lock.json  ./
# TODO install only production dependencies after (re)moving data source availability check test
RUN npm install --ignore-scripts --progress=false --cache .npm-cache && \
    rm -rf .npm-cache .npmrc package-lock.json

# FAKETIME
# USER root
RUN apk add --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing/ libfaketime && \
    rm -rf /var/cache/apk/*

# Remove busybox links
RUN busybox --list-full | \
    grep -E "bin/ifconfig$|bin/ip$|bin/netstat$|bin/nc$|bin/poweroff$|bin/reboot$" | \
    sed 's/^/\//' | xargs rm -f

# Create a non-root user
RUN addgroup -S nonroot && \
    adduser -S nonroot -G nonroot -h /app -u 1001 -D && \
    chown -R nonroot /app

# Disable persistent history
RUN touch /app/.ash_history && \
    chmod a=-rwx /app/.ash_history && \
    chown root:root /app/.ash_history

USER nonroot

EXPOSE 3006
CMD ["node", "-r",  "dotenv/config", "dist/index.js"]

# For FAKETIME use prefix like:
# LD_PRELOAD=/usr/local/lib/libfaketime.so.1 FAKETIME="@2022-02-22 20:22:00" date
# LD_PRELOAD=/usr/local/lib/libfaketime.so.1 FAKETIME="@2022-02-22 20:22:00" npm run start
