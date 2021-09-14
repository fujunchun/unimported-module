import simpleGit from "simple-git";

import * as fs from "./fs";
import readPkgUp from "read-pkg-up";

import path, { join } from "path";
import ora from "ora";
import { printResults } from "./print";
import * as meta from "./meta";
import { getResultObject, traverse, TraverseConfig } from "./traverse";
import chalk from "chalk";
import yargs, { Arguments } from "yargs";
import { CompilerOptions } from "typescript";
import { processResults, ProcessedResult } from "./process";
import {
  getConfig,
  Config,
  updateAllowLists,
  writeConfig,
  getPreset,
  UnimportedConfig,
} from "./config";
import {
  getCacheIdentity,
  InvalidCacheError,
  purgeCache,
  storeCache,
} from "./cache";
import { log } from "./log";
import { presets } from "./presets";

export interface TsConfig {
  compilerOptions: CompilerOptions;
}

export interface JsConfig {
  compilerOptions: CompilerOptions;
}

export interface PackageJson {
  name: string;
  version: string;
  main?: string;
  source?: string;
  dependencies?: { [name: string]: string };
  optionalDependencies?: { [name: string]: string };
  devDependencies?: { [name: string]: string };
  bundleDependencies?: { [name: string]: string };
  peerDependencies?: { [name: string]: string };
  meteor?: {
    mainModule?: {
      client: string;
      server: string;
    };
  };
  repository?: {
    directory: string;
  };
}

export interface Context {
  cwd: string;
  dependencies: { [key: string]: string };
  peerDependencies: { [key: string]: string };
  cache?: boolean;
  config: Config;
  moduleDirectory: string[];
  cacheId?: string;
}

const oraStub = {
  set text(msg) {
    log.info(msg);
  },
  stop(msg = "") {
    log.info(msg);
  },
};

export async function unimported(
  unimportedConfig: UnimportedConfig
): Promise<ProcessedResult | void> {
  // const projectPkg = await readPkgUp({ cwd: args.cwd });
  // const unimportedPkg = await readPkgUp({ cwd: __dirname });

  const cwd = process.cwd();

  console.log("unimported cwd:", cwd);

  // clear cache
  purgeCache();

  try {
    const config = await getConfig(unimportedConfig);

    // args.showConfig
    // args.showPreset

    const [dependencies, peerDependencies] = await Promise.all([
      meta.getDependencies(cwd),
      meta.getPeerDependencies(cwd),
    ]);

    const moduleDirectory = config.moduleDirectory ?? ["node_modules"];

    const context: Context = {
      dependencies,
      peerDependencies,
      config,
      moduleDirectory,
      cwd,
    };

    const traverseResult = getResultObject();

    for (const entry of config.entryFiles) {
      log.info("start traversal at %s", entry);

      const traverseConfig: TraverseConfig = {
        extensions: entry.extensions,
        // resolve full path of aliases
        aliases: await meta.getAliases(entry, unimportedConfig),
        cacheId: undefined, // no cache
        flow: config.flow,
        moduleDirectory,
        preset: config.preset,
        dependencies,
      };

      // console.log("entry file:", path.resolve(entry.file));
      // we can't use the third argument here, to keep feeding to traverseResult
      // as that would break the import alias overrides. A client-entry file
      // can resolve `create-api` as `create-api-client.js` while server-entry
      // would resolve `create-api` to `create-api-server`. Sharing the subresult
      // between the initial and retry attempt, would make it fail cache recovery
      const subResult = await traverse(
        path.resolve(entry.file),
        traverseConfig
      ).catch((err) => {
        if (err instanceof InvalidCacheError) {
          purgeCache();
          // Retry once after invalid cache case.
          return traverse(path.resolve(entry.file), traverseConfig);
        } else {
          throw err;
        }
      });

      subResult.files = new Map([...subResult.files].sort());

      // and that's why we need to merge manually
      subResult.modules.forEach((module) => {
        traverseResult.modules.add(module);
      });
      subResult.unresolved.forEach((unresolved) => {
        traverseResult.unresolved.add(unresolved);
      });

      for (const [key, stat] of subResult.files) {
        const prev = traverseResult.files.get(key);

        if (!prev) {
          traverseResult.files.set(key, stat);
          continue;
        }

        const added = new Set(prev.imports.map((x) => x.path));

        for (const file of stat.imports) {
          if (!added.has(file.path)) {
            prev.imports.push(file);
            added.add(file.path);
          }
        }
      }
    }

    // traverse the file system and get system data
    const baseUrl = (await fs.exists("src", cwd)) ? join(cwd, "src") : cwd;
    const files = await fs.list("**/*", baseUrl, {
      extensions: config.extensions,
      ignore: config.ignorePatterns,
    });

    const normalizedFiles = files.map((path) => path.replace(/\\/g, "/"));

    const result = await processResults(
      normalizedFiles,
      traverseResult,
      context
    );

    return result;
  } catch (error) {
    throw error;
  }
}
