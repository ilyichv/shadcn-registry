# shadcn-registry

CLI tool to generate [shadcn](https://ui.shadcn.com/) compatible registries.

## Installation

```bash
npm install shadcn-registry
```

## Usage

1. Create a registry file. Registry files should be in JSON format and validate against the [registry schema](./src/registry/registry.schema.ts). You can find examples in the [examples](./examples) directory.

2. Build the registry:
    ```bash
    npx shadcn-registry build <path-to-registry>
    ```

    ## Options

    - `-p, --path <path>`: The path to output the registry files.
    - `-i, --index <path>`: The path to output the registry index file.
    - `--index-include <types...>`: The types to include in the registry index file. Can be one or more of `ui`, `hook`, `lib`.

3. Et voilà! Your registry files are now ready to be used with shadcn CLI.


## CI/CD

You can use shadcn-registry in your CI/CD pipeline to automatically generate your registry files.

```json
"scripts": {
    "build:registry": "npx shadcn-registry@latest build <path-to-registry>"
}
```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING](./CONTRIBUTING.md) file for details.
