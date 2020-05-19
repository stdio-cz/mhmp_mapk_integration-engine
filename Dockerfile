FROM node:12
WORKDIR /user/src/app/

COPY package.json yarn.lock ./
RUN yarn install
COPY --chown=node:node . .
RUN npm run build-minimal && \
    rm -rf `find . -maxdepth 1 ! -name . ! -name dist ! -name package.json ! -name config ! -name node_modules ! -name commitsha ! -name test -print` && \
    mkdir -p test/datasources-test

CMD ["npm","start"]
