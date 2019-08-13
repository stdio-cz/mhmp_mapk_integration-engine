[![coverage report](http://gitlab.oict.cz/data-platform/integration-engine/badges/master/coverage.svg)](http://gitlab.oict.cz/data-platform/integration-engine/commits/master)

# Golemio Integration Engine

Integration Engine of the Golemio data platform.

Developed by http://operatorict.cz

## Prerequisites

- NodeJS
- MongoDB
- PostgreSQL
- Redis
- yarn
- golemio-schema-definitions module

## Installation

### A) Docker compose
1. create docker network if not already exists `docker network create golemio`
2. `docker-compose up -d` will start all necessary services


### B) Local instalation

Install Node, MongoDB, PostgreSQL and Redis.

Create the `.npmrc` file and type to it the url to the OICT private npm proxy registry:
```
registry=http://<url_to_oict_registry>
```

Install all dependencies using command:
```
yarn install
```

## Configuration

Configuration is split to environment (.env file) options and other specific options (e.g. datasources).

The specific configuration files are in the `config/` directory. Default options are in the files, which names contains `.default`. If you want to override the default options, you can create the file with the same name but without word `.default`, e.g. `datasources.default.json` -> `datasources.json`. The default and specific configuration files are merged by the rule: specific options overrides default options.

Environment options can be set with the system (e.g. in debian with `export NODE_ENV=test`) or with the `.env` file. Example of the `.env` file is saved as `.env.template`.


## Compilation of typescript code

To compile typescript code into js one-time:
```
npm run build
```
or run this, to watch all changes
```
npm run build-watch
```
or run via TypeScript
```
npm run dev-start
```
or run with a debugger
```
npm run dev-start-debug
```
from the application's root directory.


## Running MongoDB database

Run Mongo Daemon by:
```
/usr/bin/mongod
```
on Unix, or
```
C:\Program Files\MongoDB\Server\*.*\bin\mongod.exe
```
on Windows


## Migrating PostgreSQL database

Before start the PostgreSQL database has to be created and migrated. In this case is used `db-migrate` from the `golemio-schema-definitions` module.

For more informations see [`golemio-schema-definitions` README](https://gitlab.oict.cz/data-platform/schema-definitions/blob/master/README.md#data-platform-database-schema-definitions).


## Run

```
npm start
```

from the application's root directory.

Application is now running locally and processing messages from the queue.


## Tests

To run all test defined in /test directory simply run this command:
```
npm test
```
from the application's root directory. All tests should pass.

To run all DataSources tests defined in /test/DataSourcesAvailabilityChecking.test.ts file run this command:
```
npm run datasources-test
```
from the application's root directory.


## Problems?

Contact benak@operatorict.cz or vycpalek@operatorict.cz

## Useful tips & links
[Installing MongoDB database](https://docs.mongodb.com/master/tutorial/install-mongodb-on-debian/?_ga=1.255632584.174019589.1492515586)

### Installing MongoDB
Install MongoDB from package

Binaries for MongoDB database are in `/usr/bin/` on Unix or `C:\Program Files\MongoDB\Server\3.4\bin` on Windows

For example run Mongo Shell by:
```
/usr/bin/mongo
```
on Unix, or
```
C:\Program Files\MongoDB\Server\3.4\bin\mongo.exe
```
on Windows

Create a folder `/data/db` if it doesn't exist -- MongoDB stores its data there (Unix systems)