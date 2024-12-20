// originally from https://github.com/shadcn-ui/ui/blob/main/apps/www/scripts/build-registry.mts

import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { rimraf } from "rimraf";
import { Project, ScriptKind } from "ts-morph";
import type { z } from "zod";
import {
	type Registry,
	registryEntrySchema,
	type registryItemTypeSchema,
} from "./schema";

const REGISTRY_INDEX_WHITELIST: z.infer<typeof registryItemTypeSchema>[] = [
	"registry:ui",
	"registry:lib",
	"registry:hook",
	"registry:block",
	"registry:example",
];

async function createTempSourceFile(filename: string) {
	const dir = await fs.mkdtemp(path.join(tmpdir(), "shadcn-"));
	return path.join(dir, filename);
}

// ----------------------------------------------------------------------------
// Build __registry__/index.tsx.
// ----------------------------------------------------------------------------
export async function buildRegistryIndex(
	registry: Registry,
	outputDir: string,
) {
	let index = `// @ts-nocheck
// This file is autogenerated by scripts/build-registry.ts
// Do not edit this file directly.
import * as React from "react"

export const Index: Record<string, any> = {`;
	for (const item of registry) {
		const resolveFiles = item.files?.map(
			(file) => `registry/${typeof file === "string" ? file : file.path}`,
		);
		if (!resolveFiles) {
			continue;
		}

		const type = item.type.split(":")[1];
		const sourceFilename = "";

		const chunks: any[] = [];

		let componentPath = `@/registry/${type}/${item.name}`;

		if (item.files) {
			const files = item.files.map((file) =>
				typeof file === "string" ? { type: "registry:page", path: file } : file,
			);
			if (files?.length) {
				componentPath = `@/registry/${files[0].path}`;
			}
		}

		index += `
"${item.name}": {
  name: "${item.name}",
  description: "${item.description ?? ""}",
  type: "${item.type}",
  registryDependencies: ${JSON.stringify(item.registryDependencies)},
  files: [${resolveFiles.map((file) => `"${file}"`)}],
  component: React.lazy(() => import("${componentPath}")),
  source: "${sourceFilename}",
  category: "${item.category ?? ""}",
  subcategory: "${item.subcategory ?? ""}",
  chunks: [${chunks.map(
		(chunk) => `{
    name: "${chunk.name}",
    description: "${chunk.description ?? "No description"}",
    component: ${chunk.component}
    file: "${chunk.file}",
    container: {
      className: "${chunk.container.className}"
    }
  }`,
	)}]
},`;
	}

	index += `
}`;

	const registryIndexPath = path.join(process.cwd(), outputDir);
	rimraf.sync(path.join(registryIndexPath, "index.tsx"));
	await fs.writeFile(path.join(registryIndexPath, "index.tsx"), index);
}

export async function buildRegistry(
	registry: Registry,
	outputDir: string,
	includedTypes: ("ui" | "hook" | "lib")[],
) {
	const registryPath = path.join(process.cwd(), outputDir);

	const project = new Project({
		compilerOptions: {},
	});

	// ----------------------------------------------------------------------------
	// Build registry/index.json.
	// ----------------------------------------------------------------------------
	const items = registry
		.filter((item) =>
			includedTypes.map((type) => `registry:${type}`).includes(item.type),
		)
		.map((item) => {
			return {
				...item,
				files: item.files?.map((_file) => {
					const file =
						typeof _file === "string"
							? {
									path: _file,
									type: item.type,
								}
							: _file;

					return file;
				}),
			};
		});
	const registryJson = JSON.stringify(items, null, 2);

	rimraf.sync(path.join(registryPath, "index.json"));
	await fs.writeFile(
		path.join(registryPath, "index.json"),
		registryJson,
		"utf8",
	);

	// ----------------------------------------------------------------------------
	// Build registry/[type]/[name].json.
	// ----------------------------------------------------------------------------
	for (const item of registry) {
		if (!REGISTRY_INDEX_WHITELIST.includes(item.type)) {
			continue;
		}

		let files: any[] = [];
		if (item.files) {
			files = await Promise.all(
				item.files.map(async (_file) => {
					const file =
						typeof _file === "string"
							? {
									path: _file,
									type: item.type,
									content: "",
									target: "",
								}
							: _file;

					let content: string;
					try {
						content = await fs.readFile(
							path.join(process.cwd(), "registry", file.path),
							"utf8",
						);
					} catch (error) {
						return;
					}

					const tempFile = await createTempSourceFile(file.path);
					const sourceFile = project.createSourceFile(tempFile, content, {
						scriptKind: ScriptKind.TSX,
					});

					sourceFile.getVariableDeclaration("iframeHeight")?.remove();
					sourceFile.getVariableDeclaration("containerClassName")?.remove();
					sourceFile.getVariableDeclaration("description")?.remove();

					let target = file.target;

					if ((!target || target === "") && item.name.startsWith("v0-")) {
						const fileName = file.path.split("/").pop();

						if (
							file.type === "registry:block" ||
							file.type === "registry:example"
						) {
							target = `components/${fileName}`;
						}

						if (file.type === "registry:ui") {
							target = `components/ui/${fileName}`;
						}

						if (file.type === "registry:hook") {
							target = `hooks/${fileName}`;
						}

						if (file.type === "registry:lib") {
							target = `lib/${fileName}`;
						}
					}

					return {
						path: file.path,
						type: file.type,
						content: sourceFile.getText(),
						target,
					};
				}),
			);
		}

		const payload = registryEntrySchema
			.omit({
				source: true,
				category: true,
				subcategory: true,
				chunks: true,
			})
			.safeParse({
				...item,
				files,
			});

		if (payload.success) {
			await fs.writeFile(
				path.join(registryPath, `${item.name}.json`),
				JSON.stringify(payload.data, null, 2),
				"utf8",
			);
		}
	}
}
