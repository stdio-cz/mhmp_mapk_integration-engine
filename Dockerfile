FROM gitlab.oict.cz:4567/data-platform/schema-definitions:latest

RUN ls -la

RUN mkdir -p /home/node/app/integration-engine

RUN ls -la

WORKDIR /home/node/app/integration-engine

COPY . .

RUN ls -la

USER node

RUN npm install
RUN npm run build

CMD ["npm","start"]
