import { promises as fs, existsSync } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import ora from "ora";
import { z } from "zod";
import { buildRegistry, buildRegistryIndex } from "../registry/build-registry";
import { registrySchema } from "../registry/schema";
import { handleError } from "../utils/handle-error";

const buildOptionsSchema = z.object({
	registry: z.string().describe("the path to registry file"),
	path: z
		.string()
		.describe("the folder to output the registry file")
		.optional()
		.default("public/r"),
	index: z
		.string()
		.describe(
			"the folder to output the registry index file, if not provided, the index file will not be generated",
		)
		.optional(),
	indexInclude: z
		.array(z.enum(["ui", "hook", "lib"]))
		.describe("the types of items to include in the index file")
		.optional()
		.default(["ui"]),
});

export const build = new Command("build")
	.description("Build the registry")
	.argument("<registry>", "the path to registry file")
	.option("-p, --path <path>", "the path to output the registry file")
	.option(
		"-i, --index <path>",
		"the folder to output the registry index file, if not provided, the index file will not be generated",
	)
	.option(
		"--index-include <types...>",
		"the types of items to include in the index file",
	)
	.action(async (registryPath, opts) => {
		try {
			const spinner = ora("Building registry").start();

			const options = buildOptionsSchema.parse({
				registry: registryPath,
				...opts,
			});

			if (!existsSync(options.path)) {
				await fs.mkdir(options.path, { recursive: true });
			}

			const registryFile = await fs.readFile(
				path.resolve(process.cwd(), options.registry),
				"utf-8",
			);

			const registry = registrySchema.parse(JSON.parse(registryFile));
			await buildRegistry(registry, options.path, options.indexInclude);

			if (options.index) {
				if (!existsSync(options.index)) {
					await fs.mkdir(options.index, { recursive: true });
				}

				await buildRegistryIndex(registry, options.index);
			}

			spinner.succeed("Registry built successfully");
		} catch (error) {
			handleError(error);
		}
	});
