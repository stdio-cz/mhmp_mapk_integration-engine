FROM bitnami/node:16.13.0 AS build
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build-minimal


#FROM bitnami/node:16.13.0-prod
FROM node:16
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
