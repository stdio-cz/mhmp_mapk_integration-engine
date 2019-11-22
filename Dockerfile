FROM node:12
WORKDIR /user/src/app/

COPY package.json .npmrc* ./
RUN yarn install
COPY --chown=node:node . .
RUN npm run build-minimal && \
    rm -rf `find . -maxdepth 1 ! -name . ! -name dist ! -name package.json ! -name config ! -name node_modules -print`

CMD ["npm","start"]
