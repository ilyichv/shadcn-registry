import { promises as fs } from "node:fs";
import path from "node:path";
import { Command } from "commander";
import ora from "ora";
import { getItemDependencies } from "../registry/get-item-dependencies";
import type { Registry, RegistryItemType } from "../registry/schema";
import { handleError } from "../utils/handle-error";

const REGISTRY_TYPE_FOLDER_MAP: Partial<Record<RegistryItemType, string[]>> = {
	"registry:hook": ["hooks"],
	"registry:ui": ["ui"],
	"registry:lib": ["lib"],
};

export const generate = new Command("generate")
	.description("Generate a new registry")
	.argument("<path>", "registry input folder")
	.action(async (inputPath) => {
		try {
			const spinner = ora("Generating registry").start();
			const allowedFolders = Object.values(REGISTRY_TYPE_FOLDER_MAP).flat();
			const registry: Registry = [];
			const directories = await fs.readdir(inputPath, { withFileTypes: true });
			const allowedDirs = directories.filter(
				(dirent) =>
					dirent.isDirectory() && allowedFolders.includes(dirent.name),
			);

			for (const dir of allowedDirs) {
				const dirPath = path.join(inputPath, dir.name);
				const files = await fs.readdir(dirPath, { withFileTypes: true });

				const filesInDir = files.filter((file) => file.isFile());

				for (const file of filesInDir) {
					const type = Object.entries(REGISTRY_TYPE_FOLDER_MAP).find(
						([_, folders]) => folders.includes(dir.name),
					)?.[0] as RegistryItemType | undefined;

					if (!type) {
						throw new Error(`Unknown registry type for folder ${dir.name}`);
					}

					const dependencies = getItemDependencies(file);

					registry.push({
						name: file.name.replace(".ts", ""),
						type,
						files: [`${dir.name}/${file.name}`, ...dependencies.internal],
						dependencies: dependencies.external,
					});
				}
			}

			const registryJson = JSON.stringify(registry, null, 2);
			await fs.writeFile(
				path.join(inputPath, "index.json"),
				registryJson,
				"utf8",
			);

			spinner.succeed("Registry generated successfully");
		} catch (error) {
			handleError(error);
		}
	});
