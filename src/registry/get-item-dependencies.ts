import path from "node:path";
import type { Dirent } from "fs-extra";
import {
	type CompilerOptions,
	type ImportDeclaration,
	Project,
} from "ts-morph";

const EXCLUDED_EXTERNAL_DEPENDENCIES = ["react"];

interface Dependencies {
	internal: string[];
	external: string[];
}

const project = new Project({
	tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

export function getItemDependencies(file: Dirent): Dependencies {
	const dependencies: Dependencies = {
		internal: [],
		external: [],
	};

	const filePath = path.join(file.parentPath, file.name);
	const sourceFile = project.addSourceFileAtPath(filePath);
	const compilerOptions = project.getCompilerOptions();

	const pathAliases = getPathAliases(compilerOptions);

	processImports(
		sourceFile.getImportDeclarations(),
		dependencies,
		pathAliases,
		filePath,
	);

	project.removeSourceFile(sourceFile);

	return dependencies;
}

function getPathAliases(compilerOptions: CompilerOptions): string[] {
	const paths = compilerOptions.paths || {};
	return Object.keys(paths);
}

function processImports(
	imports: ImportDeclaration[],
	dependencies: Dependencies,
	pathAliases: string[],
	filePath: string,
): void {
	for (const importDecl of imports) {
		const moduleSpecifier = importDecl.getModuleSpecifierValue();

		if (moduleSpecifier.startsWith("./") || moduleSpecifier.startsWith("../")) {
			processRelativeImport(moduleSpecifier, dependencies, filePath);
			continue;
		}

		const matchedAlias = pathAliases.find((alias) =>
			moduleSpecifier.startsWith(alias.replace("/*", "")),
		);

		if (matchedAlias) {
			processAliasImport(moduleSpecifier, matchedAlias, dependencies);
			continue;
		}

		if (!EXCLUDED_EXTERNAL_DEPENDENCIES.includes(moduleSpecifier)) {
			dependencies.external.push(moduleSpecifier);
		}
	}
}

function processRelativeImport(
	moduleSpecifier: string,
	dependencies: Dependencies,
	filePath: string,
): void {
	const resolvedPath = path.resolve(path.dirname(filePath), moduleSpecifier);
	const relativePath = path.relative(process.cwd(), resolvedPath);
	const pathSegments = relativePath.split(path.sep).slice(-2);

	if (pathSegments.length === 2) {
		dependencies.internal.push(`${pathSegments.join("/")}.ts`);
	}
}

function processAliasImport(
	moduleSpecifier: string,
	aliasPath: string,
	dependencies: Dependencies,
): void {
	const pathWithoutAlias = moduleSpecifier
		.replace(aliasPath.replace("/*", ""), "")
		.replace(/^\//, "");
	dependencies.internal.push(`${pathWithoutAlias}.ts`);
}
