FROM gitlab.oict.cz:4567/data-platform/schema-definitions:latest

USER node

WORKDIR /home/node/app/

COPY . .

RUN ls -la

WORKDIR /home/node/app/integration-engine
RUN npm install
RUN npm run build

CMD ["npm","start"]
