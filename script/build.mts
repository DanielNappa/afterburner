/**
 * Build script adapted from
 * https://github.com/openai/codex/blob/main/codex-cli/build.mjs
 */
import * as fs from "node:fs";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

type Plugin<T extends string> = T extends "Bun" ? import("bun").BunPlugin
  : import("esbuild").Plugin;

type OnResolveArgs = import("esbuild").OnResolveArgs;

type PluginBuild<T extends string> = T extends "Bun"
  ? import("bun").PluginBuilder : import("esbuild").PluginBuild;

const __dirname: string = dirname(fileURLToPath(import.meta.url));
const __rootDirectory: string = dirname(
  dirname(fileURLToPath(import.meta.url)),
);
const __cliDirectory: string = join(__rootDirectory, "src");
const __distDirectory: string = join(__rootDirectory, "dist");
const __distBinDirectory: string = join(__distDirectory, "bin");
const entryPoint: string = join(
  __cliDirectory,
  "index.tsx",
);
const tsConfig: string = join(__rootDirectory, "tsconfig.json");
const packagePath: string = join(__rootDirectory, "package.json");
const distPackagePath: string = join(__distDirectory, "package.json");
const inject: string = join(__dirname, "require.ts");


const isDevBuild: boolean = process.argv.includes("--dev") ||
  process.env.NODE_ENV === "development";

// Build Hygiene, ensure we drop previous dist dir and any leftover files
const outPath: string = resolve(__distDirectory);
if (fs.existsSync(outPath)) {
  fs.rmSync(outPath, { recursive: true, force: true });
}
interface IgnorePluginOptions {
  name: string;
  filter: RegExp;
  namespace: string;
}

function createIgnorePlugin<T extends string>(
  options: IgnorePluginOptions,
): Plugin<T> {
  return {
    name: options.name,
    setup(build: PluginBuild<T>) {
      // When an import for filter is encountered,
      // return an empty module.
      build.onResolve(
        { filter: options.filter },
        (args: OnResolveArgs | Bun.OnResolveArgs) => {
          return { path: args.path, namespace: options.namespace };
        },
      );
      build.onLoad({ filter: /.*/, namespace: options.namespace }, () => {
        return { contents: "", loader: "js" };
      });
    },
  } as Plugin<T>;
}

function postBuild(): void {
  // Copy additional files to dist
  const rootPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const filesToCopy: string[] = ["README.md", "LICENSE"];
  filesToCopy.forEach((file: string) => {
    const source: string = join(__rootDirectory, file);
    const destination: string = join(__distDirectory, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, destination);
    }
  });

  if (!isDevBuild) {
    // Produce production package.json with bin and main
    const distPackage = {
      name: rootPackage.name,
      description: rootPackage.description,
      version: rootPackage.version,
      license: rootPackage.license,
      type: rootPackage.type,
      main: "bin/index.js",
      bin: {
        "afterburner": "bin/index.js",
      },
      files: rootPackage.files,
      repository: rootPackage.repository,
      bugs: rootPackage.bugs,
      homepage: rootPackage.homepage,
      keywords: rootPackage.keywords,
    };

    fs.writeFileSync(distPackagePath, JSON.stringify(distPackage, null, 2));
  }
}

if (process.versions.bun) {
  const { build } = await import("bun");
  const ignoreReactDevToolsPlugin: Plugin<"Bun"> = createIgnorePlugin<"Bun">({
    name: "ignore-react-devtools",
    filter: /^react-devtools-core$/,
    namespace: "ignore-devtools",
  });
  try {
    await build({
      entrypoints: [entryPoint],
      loader: { ".node": "file" },
      // Do not bundle the contents of package.json at build time: always read it
      // at runtime.
      external: [packagePath, "vscode", "node:child_process", "uglify-js"],
      format: "esm",
      target: "bun",
      tsconfig: tsConfig,
      outdir: __distBinDirectory,
      minify: !isDevBuild,
      sourcemap: isDevBuild ? "inline" : "external",
      plugins: [ignoreReactDevToolsPlugin],
    });
    postBuild();
    const bundle: Bun.BunFile = Bun.file(join(__distBinDirectory, "index.js"));
    const contents: string = await bundle.text();
    // Replace the shebang line
    const updated: string = contents.replace(
      /^#!.*\n/,
      "#!/usr/bin/env node\n", // using node for now for compatibility
    );

    // Write back the modified file
    await Bun.write(bundle, updated);
  } catch (error: unknown) {
    if (error instanceof Error) console.trace(error.message);
    process.exit(1);
  }
} else {
  const { build } = await import("esbuild");
  const ignoreReactDevToolsPlugin: Plugin<"Node"> = createIgnorePlugin<"Node">({
    name: "ignore-react-devtools",
    filter: /^react-devtools-core$/,
    namespace: "ignore-devtools",
  });

  try {
    await build({
      entryPoints: [entryPoint],
      loader: { ".node": "file" },
      // Do not bundle the contents of package.json at build time: always read it
      // at runtime.
      external: [packagePath, "vscode", "node:child_process", "uglify-js"],
      bundle: true,
      format: "esm",
      platform: "node",
      tsconfig: tsConfig,
      outfile: `${__distBinDirectory}/index.js`,
      minify: !isDevBuild,
      sourcemap: isDevBuild ? "inline" : true,
      plugins: [ignoreReactDevToolsPlugin],
      inject: [inject],
    });
    postBuild();
  } catch (error: unknown) {
    if (error instanceof Error) console.trace(error.message);
    process.exit(1);
  }
}
