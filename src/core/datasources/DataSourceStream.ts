import { Readable } from "stream";

export class DataSourceStream extends Readable {
  public onDataListeners = [];
  public processing = false;
  private onEndFunction: () => Promise<void> = null;
  private streamEnded = false;

  constructor(...args: any) {
    super(...args);

    // to avoid data loss use proceed method or streamReady event to add on 'data' listeners
    this.on("streamReady", () => {
      this.onDataListeners.forEach((listener) => {
          this.on("data", listener);
      });
    });
  }

  public setOnEndFunction = (
    onEndFunction: () => Promise<void>,
  ): DataSourceStream => {
    this.onEndFunction = onEndFunction;
    return this;
  }

  public setDataProcessor = (
    onDataFunction: (data: any) => Promise<void>,
  ): DataSourceStream => {
    this.onDataListeners.push(async (data: any) => {
      this.pause();
      this.processing = true;

      try {
        await onDataFunction(data);
      } catch (err) {
          this.emit("error", err);
      }

      this.processing = false;
      this.resume();
    });

    return this;
  }

  public waitForEnd = async (): Promise<void> => {
    await new Promise((resolve, reject) => {
      this.on("error", (error) => reject(error));
      this.on("end", async () => {
          const checker = setInterval(async () => {
              if (!this.processing && !this.streamEnded) {
                  clearInterval(checker);
                  if (this.onEndFunction && !this.streamEnded) {
                    await this.onEndFunction();
                  }
                  resolve();
              }
          }, 1000);
      });
  });
  }

  public proceed = async (): Promise<void> => {
    this.emit("streamReady");
    return this.waitForEnd();
  }
}
