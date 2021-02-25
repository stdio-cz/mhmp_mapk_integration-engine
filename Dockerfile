FROM node:12 AS build
WORKDIR /user/src/app/
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build-minimal


FROM node:12
WORKDIR /user/src/app/
COPY --chown=node:node --from=build /user/src/app/node_modules node_modules
COPY --chown=node:node --from=build /user/src/app/dist dist
COPY --chown=node:node config config
COPY --chown=node:node package.json ./

USER node

CMD ["yarn", "start"]
