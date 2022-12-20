// Load reflection lib
import "@golemio/core/dist/shared/_global";
// Load telemetry before all deps
import { IConfiguration } from "@golemio/core/dist/integration-engine/config";
import { ContainerToken, IntegrationEngineContainer } from "@golemio/core/dist/integration-engine/ioc";
import { initTraceProvider } from "@golemio/core/dist/monitoring";

const config = IntegrationEngineContainer.resolve<IConfiguration>(ContainerToken.Config);
initTraceProvider(config.app_name, config.NODE_ENV, config.telemetry);
// Start the app
import App from "./App";
new App().start();
