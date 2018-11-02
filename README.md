# Data Platform Integration Engine

Integration Engine of the Data Platform System.

Developed by http://operatorict.cz

## Prerequisites

- node.js
- mongo
- npm
- data-platform-schema-definitions module

## Installation

Download repository `data-platform-schema-definitions` to the same directory as the directory of this repository and name it `schema-definitions/`. For the better understanding the dependency is visible in the `package.json` at the line `"data-platform-schema-definitions": "file:../schema-definitions",`.

Install Node, MongoDB

Install all npm modules using command:
```
npm install
```

## Configuration

All configuration files are in the `config/` directory. Configuration is split to environment (.env files) options and other specific options (e.g. datasources). Default options are in the files, which names contains `.default`. If you want to override the default options, you can create the file with the same name but without word `.default`, e.g. `.env.default` -> `.env.` or `datasources.default.js` -> `datasources.js`.

In the case of the other specific options (e.g. datasources) the default and specific configuration files are merged by the rule: specific options overrides default options.

Environment options can be set with the system (e.g. in debian with `export NODE_ENV=test`). In this case the options in the `.env` files are overridden. But combination of the `.env` and `.env.default` is not working, only one of them is used ([dotenv FAQ](https://github.com/motdotla/dotenv#should-i-have-multiple-env-files)).


## Compilation of typescript code

To compile typescript code into js one-time

```
npm run build
```
or run this, to watch all changes
```
npm run build-watch
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

To run all DataSources tests defined in /test/datasources directory run this command :
```
npm run datasourcesTest
```
from the application's root directory. **This kind of tests sends the report email while tests fails.**


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