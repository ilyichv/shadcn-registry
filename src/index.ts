#!/usr/bin/env node
import { Command } from "commander";

import { build } from "./commands/build";
import { generate } from "./commands/generate";
import { getPackageInfo } from "./utils/get-package-info";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

async function main() {
	const packageInfo = await getPackageInfo();

	const program = new Command()
		.name("shadcn-zod-form")
		.description("Generate shadcn/ui forms from zod schemas")
		.version(
			packageInfo.version || "1.0.0",
			"-v, --version",
			"display the version number",
		);

	program.addCommand(build);
	program.addCommand(generate);
	program.parse();
}

main();
