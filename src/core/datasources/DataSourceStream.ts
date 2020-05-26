import { Readable } from "stream";

export class DataSourceStream extends Readable {
  public onDataListeners = [];

}
