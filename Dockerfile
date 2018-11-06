FROM gitlab.oict.cz:4567/data-platform/schema-definitions:latest

USER node

WORKDIR /home/node/app/integration-engine

COPY . .

RUN ls -la

RUN npm install
RUN npm run build

CMD ["npm","start"]
