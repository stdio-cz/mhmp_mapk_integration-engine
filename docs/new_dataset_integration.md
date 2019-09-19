## Adding a new dataset

- create new directory in `src/modules` named by new dataset (lowercase, no words delimiters)
- in the new directory create Transformation(s) (data transformation from datasource format to output format) and Worker (worker methods processing messages from MQ)
- import dataset from schema-definitions
- if is required to getting data (PULL) implement new DataSource in `test/datasources-test/DataSourcesAvailabilityChecking.test.ts` and test it
- implement the Transformation(s) and test it on the data from created DataSource or on the example data supplied by analyst
- implement the Worker and test it
  - define DataSource(s), if needed
  - define Model(s)
  - implement worker methods for messages processing and whole logic
- created test files locate to `test/models/{newdataset}`
- write documentation of the new dataset implementation (to file/wiki defined by your organization)