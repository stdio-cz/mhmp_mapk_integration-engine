// load telemetry before all deps
import { initTraceProvider } from "@golemio/core/dist/telemetry";
import { config } from "@golemio/core/dist/integration-engine/config";
initTraceProvider("integration-engine", config.NODE_ENV, config.telemetry);

// start app
import App from "./App";
new App().start();
