import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { FatalError } from "@golemio/core/dist/shared/golemio-errors";
import { AbstractWorker } from "@golemio/core/dist/integration-engine";
import { ModuleLoader } from "../src/ModuleLoader";

chai.use(chaiAsPromised);

describe("ModuleLoader", () => {
    // =============================================================================
    // loadModules
    // =============================================================================
    describe("loadModules", () => {
        it("should load queue definitions and workers", async () => {
            ModuleLoader["modules"] = ["playgrounds"];

            const result = await ModuleLoader.loadModules();
            expect(result.queueDefinitions).to.deep.equal([]);
            expect(new result.workers[0]()).to.be.instanceOf(AbstractWorker);
        });

        it("should reject (non-existent module)", async () => {
            ModuleLoader["modules"] = ["fus-ro-dah"];

            const promise = ModuleLoader.loadModules();
            await expect(promise).to.be.rejectedWith(
                FatalError,
                "Cannot import module @golemio/fus-ro-dah/dist/integration-engine"
            );
        });
    });
});
