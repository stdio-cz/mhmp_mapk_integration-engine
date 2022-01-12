FROM bitnami/node:16.13.2 AS build
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build-minimal
# OpenSSL hack BEGIN:
WORKDIR /usr/src
RUN wget https://www.openssl.org/source/openssl-1.1.1m.tar.gz && \
    tar -xf openssl-1.1.1m.tar.gz && \
    cd openssl-1.1.1m && \
    ./config --prefix=/usr --openssldir=/etc/ssl --libdir=lib/x86_64-linux-gnu && \
    make
# OpenSSL hack END.

FROM bitnami/node:16.13.2-prod
# OpenSSL hack BEGIN:
COPY --from=build /usr/src/openssl-1.1.1m/engines/*.so /usr/lib/x86_64-linux-gnu/engines-1.1/
COPY --from=build /usr/src/openssl-1.1.1m/*.so.1.1 /usr/lib/x86_64-linux-gnu/
COPY --from=build /usr/src/openssl-1.1.1m/apps/openssl.cnf /etc/ssl/
COPY --from=build /usr/src/openssl-1.1.1m/apps/openssl.cnf /usr/lib/ssl/
# OpenSSL hack END.

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/test /app/test
COPY config config
COPY tsconfig.json ./
COPY package.json ./

# Create a non-root user
RUN groupadd --system nonroot &&\
    useradd --system --base-dir /app --uid 1001 --gid nonroot nonroot && \
    chown -R nonroot /app
USER nonroot

EXPOSE 3006
CMD ["yarn", "start"]
