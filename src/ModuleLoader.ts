import { AbstractWorker, IQueueDefinition } from "@golemio/core/dist/integration-engine";
import { CustomError } from "@golemio/core/dist/shared/golemio-errors";

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
        "city-districts",
        "energetics",
        "fcd",
        "firebase-pid-litacka",
        "flow",
        "chmu",
        "gardens",
        "medical-institutions",
        "microclimate",
        "mobile-app-statistics",
        "mos",
        "municipal-authorities",
        "municipal-libraries",
        "municipal-police-stations",
        "ndic",
        "parkings",
        "playgrounds",
        "rush-hour-aggregation",
        "traffic-common",
        "shared-bikes",
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
