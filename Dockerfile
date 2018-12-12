FROM gitlab.oict.cz:4567/data-platform/schema-definitions:latest

USER root

WORKDIR /home/node/app/

COPY . .

RUN chown -R node:node .

RUN ls -la

USER node

RUN npm config set registry http://10.200.0.43:4873
RUN npm install
RUN npm run build

CMD ["npm","start"]
