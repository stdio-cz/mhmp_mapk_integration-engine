FROM bitnami/node:12.21.0 AS build
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build-minimal


FROM bitnami/node:12.21.0-prod
WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY config config
COPY package.json ./

# Create a non-root user
RUN groupadd --system nonroot &&\
    useradd --system --base-dir /app --uid 1001 --gid nonroot nonroot && \
    chown -R nonroot /app
USER nonroot

EXPOSE 3006
CMD ["yarn", "start"]
