FROM data-platform/schema-definitions:latest

USER node

WORKDIR /home/node/app/

COPY . .

WORKDIR /home/node/app/integration-engine
RUN npm install
RUN npm run build

CMD ["npm","start"]
