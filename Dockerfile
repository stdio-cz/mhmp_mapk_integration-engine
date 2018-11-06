FROM gitlab.oict.cz:4567/data-platform/schema-definitions:latest

USER root

RUN mkdir -p /home/node/app/integration-engine

WORKDIR /home/node/app/integration-engine

COPY . .

RUN chown -R node:node .

RUN ls -la

USER node

RUN npm install
RUN npm run build

CMD ["npm","start"]
