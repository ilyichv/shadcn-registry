import { z } from "zod";

export const blockChunkSchema = z.object({
	name: z.string(),
	description: z.string(),
	component: z.any(),
	file: z.string(),
	code: z.string().optional(),
	container: z
		.object({
			className: z.string().nullish(),
		})
		.optional(),
});

export const registryItemTypeSchema = z.enum([
	"registry:ui",
	"registry:lib",
	"registry:hook",
	"registry:block",
	"registry:example",
]);

export const registryItemFileSchema = z.union([
	z.string(),
	z.object({
		path: z.string(),
		content: z.string().optional(),
		type: registryItemTypeSchema,
		target: z.string().optional(),
	}),
]);

export const registryItemTailwindSchema = z.object({
	config: z.object({
		content: z.array(z.string()).optional(),
		theme: z.record(z.string(), z.any()).optional(),
		plugins: z.array(z.string()).optional(),
	}),
});

export const registryItemCssVarsSchema = z.object({
	light: z.record(z.string(), z.string()).optional(),
	dark: z.record(z.string(), z.string()).optional(),
});

export const registryEntrySchema = z.object({
	name: z.string(),
	type: registryItemTypeSchema,
	description: z.string().optional(),
	dependencies: z.array(z.string()).optional(),
	devDependencies: z.array(z.string()).optional(),
	registryDependencies: z.array(z.string()).optional(),
	files: z.array(registryItemFileSchema).optional(),
	tailwind: registryItemTailwindSchema.optional(),
	cssVars: registryItemCssVarsSchema.optional(),
	source: z.string().optional(),
	category: z.string().optional(),
	subcategory: z.string().optional(),
	chunks: z.array(blockChunkSchema).optional(),
});

export const registrySchema = z.array(registryEntrySchema);

export type RegistryEntry = z.infer<typeof registryEntrySchema>;

export type Registry = z.infer<typeof registrySchema>;