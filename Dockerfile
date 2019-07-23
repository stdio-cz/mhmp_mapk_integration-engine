FROM node:8

WORKDIR /home/node/app/

COPY . .

RUN chown -R node:node .

RUN ls -la

RUN yarn install
RUN npm run build

CMD ["npm","start"]
