// load telemetry before all deps
import { initTraceProvider } from "@golemio/core/dist/telemetry";
initTraceProvider("integration-engine");

// start app
import App from "./App";
new App().start();
