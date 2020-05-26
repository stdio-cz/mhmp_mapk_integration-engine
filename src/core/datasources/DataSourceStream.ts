import { Readable } from "stream";

export class DataSourceStream extends Readable {
  public onDataListeners = [];

  constructor(...args: any) {
    super(...args);

    // to avoid data loss use proceed method or streamReady event to add on 'data' listeners
    this.on("streamReady", () => {
      this.onDataListeners.forEach((listener) => {
          this.on("data", listener);
      });
    });
  }

  public proceed = (): void => {
    this.emit("streamReady");
  }
}
