FROM node:8

WORKDIR /home/node/app/

COPY . .

RUN chown -R node:node .

RUN ls -la

RUN npm config set registry http://10.200.0.43:4873
RUN npm install
RUN npm run build

CMD ["npm","start"]
