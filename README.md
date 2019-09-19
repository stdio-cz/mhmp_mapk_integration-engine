[![pipeline status](http://gitlab.oict.cz/data-platform/integration-engine/badges/master/pipeline.svg)](http://gitlab.oict.cz/data-platform/integration-engine/commits/master)
[![coverage report](http://gitlab.oict.cz/data-platform/integration-engine/badges/master/coverage.svg)](http://gitlab.oict.cz/data-platform/integration-engine/commits/master)

# Golemio Integration Engine

Integration Engine of the Golemio data platform.

Developed by http://operatorict.cz


## Docker instalation

### Prerequisites
- Docker Engine (https://docs.docker.com/)
- RabbitMQ (https://www.rabbitmq.com/)
- Mongo (https://www.mongodb.com)
- Postgres (https://www.postgresql.org/)
- Redis (https://redis.io/)
- Golemio Schema Definitions

### Instalation & run using Docker Compose

1. create docker network if not already exists `docker network create golemio`
2. `docker-compose up -d` will start all necessary services


## Local instalation

### Prerequisites

- node.js (https://nodejs.org)
- RabbitMQ (https://www.rabbitmq.com/)
- Mongo (https://www.mongodb.com)
- Postgres (https://www.postgresql.org/)
- Redis (https://redis.io/)
- yarn (https://yarnpkg.com)
- TypeScript (https://www.typescriptlang.org/)
- Golemio Schema Definitions

### Installation

Install all prerequisites

Install all dependencies using command:
```
yarn install
```

from the application's root directory.

### Configuration

Configuration is split to environment (.env file) options and other specific options (e.g. datasources).

The specific configuration files are in the `config/` directory. Default options are in the files, which names contains `.default`. If you want to override the default options, you can create the file with the same name but without word `.default`, e.g. `datasources.default.json` -> `datasources.json`. The default and specific configuration files are merged by the rule: specific options overrides default options.

Environment options can be set with the system (e.g. in debian with `export NODE_ENV=test`) or with the `.env` file. Example of the `.env` file is saved as `.env.template`.

Project uses `dotenv` package: https://www.npmjs.com/package/dotenv

### Migrating PostgreSQL and MongoDB databases

Before start the databases have to be created and migrated. In this case is used `db-migrate` from the `@golemio/schema-definitions` module.

For more informations see [`@golemio/schema-definitions` README](https://gitlab.oict.cz/data-platform/schema-definitions/blob/master/README.md#data-platform-database-schema-definitions).

### Build & Run

#### Production

To compile typescript code into js one-time (production build):
```
npm run build
```
To run the app:

```
npm start
```

#### Dev/debug

Run via TypeScript (in this case it is not needed to build separately, application will watch for changes and restart on save):
```
npm run dev-start
```
or run with a debugger:
```
npm run dev-start-debug
```

Application is now running locally on port 3006 or on port specified in the environment variable.

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

## Logging

Logging uses `Winston` for standard logging with levels, `morgan` for http access logs and `debug` (https://www.npmjs.com/package/debug) for debugging.

All logs with `silly` and `debug` level are printed as standard log (if appropriate log level is set) using Winston as well as using `debug` module with `"golemio:integration-engine"` settings.

You can set both `LOG_LEVEL` and `DEBUG` settings in ENV variables.

## Documentation

For generating documentation run `npm run generate-docs`. Typedoc source code documentation is located in `docs/typedoc`.

More documentation in `docs/`. Mainly `new_dataset_integration.md` for description on how to add a new dataset and `configuration_files.md` for description on how properly work with config files.

## Contribution guidelines

Please read `CONTRIBUTING.md`.

## Troubleshooting

Contact benak@operatorict.cz or vycpalek@operatorict.cz
