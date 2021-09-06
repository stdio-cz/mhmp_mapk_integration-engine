// load telemetry before all deps
import { initTraceProvider } from "@golemio/core/dist/monitoring";
import { config } from "@golemio/core/dist/integration-engine/config";
initTraceProvider(config.app_name, config.NODE_ENV, config.telemetry);

// start app
import App from "./App";
new App().start();
