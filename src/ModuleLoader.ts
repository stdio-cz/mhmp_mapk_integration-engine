import "reflect-metadata";
import { CustomError } from "@golemio/core/dist/shared/golemio-errors";
import { IQueueDefinition, AbstractWorker } from "@golemio/core/dist/integration-engine";

type LoadModulesOutput = {
    queueDefinitions: IQueueDefinition[];
    workers: Array<new () => AbstractWorker>;
};

export class ModuleLoader {
    // See package.json for installed modules (@golemio/* packages)
    // and https://gitlab.com/operator-ict/golemio/code/modules for available modules
    private static modules = [
        "air-quality-stations",
        "bicycle-counters",
        "bicycle-parkings",
        "city-districts",
        "energetics",
        "fcd",
        "firebase-pid-litacka",
        "flow",
        "gardens",
        "general",
        "medical-institutions",
        "meteosensors",
        "mobile-app-statistics",
        "mos",
        "municipal-authorities",
        "municipal-libraries",
        "municipal-police-stations",
        "ndic",
        "parkings",
        "parking-zones",
        "playgrounds",
        "public-toilets",
        "rush-hour-aggregation",
        "shared-bikes",
        "shared-cars",
        "sorted-waste-stations",
        "traffic-cameras",
        "traffic-detectors",
        "waste-collection",
        "waste-collection-yards",
        "waze-ccp",
        "waze-tt",
    ];

    public static async loadModules(): Promise<LoadModulesOutput> {
        let output: LoadModulesOutput = {
            queueDefinitions: [],
            workers: [],
        };

        for (const module of ModuleLoader.modules) {
            const pkg = `@golemio/${module}/dist/integration-engine`;

            try {
                const { queueDefinitions, workers } = await import(pkg);
                if (queueDefinitions) {
                    output.queueDefinitions = output.queueDefinitions.concat(...queueDefinitions);
                }

                if (workers) {
                    output.workers = output.workers.concat(...workers);
                }
            } catch (err) {
                throw new CustomError(`Cannot import module ${pkg}.`, false, "ModuleLoader", 6004, err);
            }
        }

        return output;
    }
}
