import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { DEFAULT_STRATEGIES, DEFAULT_TAXONOMY } from "./defaults.js";
import type { Strategies, Taxonomy } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type BrokerConfig = {
  taxonomy: Taxonomy;
  strategies: Strategies;
  escalateLogPath?: string;
};

function loadYamlFile<T>(path: string): T {
  const text = readFileSync(path, "utf8");
  return parseYaml(text) as T;
}

function packagedDefaultsDir(): string {
  return join(__dirname, "..", "defaults");
}

export function loadConfig(options?: {
  taxonomyPath?: string;
  strategiesPath?: string;
  configDir?: string;
  escalateLogPath?: string;
}): BrokerConfig {
  const dir = options?.configDir ? resolve(options.configDir) : undefined;

  const taxonomyPath =
    options?.taxonomyPath ??
    (dir ? join(dir, "taxonomy.yaml") : undefined);

  const strategiesPath =
    options?.strategiesPath ??
    (dir ? join(dir, "strategies.yaml") : undefined);

  let taxonomy = DEFAULT_TAXONOMY;
  let strategies = DEFAULT_STRATEGIES;

  const packagedTaxonomy = join(packagedDefaultsDir(), "taxonomy.yaml");
  const packagedStrategies = join(packagedDefaultsDir(), "strategies.yaml");

  if (taxonomyPath && existsSync(taxonomyPath)) {
    taxonomy = loadYamlFile<Taxonomy>(taxonomyPath);
  } else if (existsSync(packagedTaxonomy)) {
    taxonomy = loadYamlFile<Taxonomy>(packagedTaxonomy);
  }

  if (strategiesPath && existsSync(strategiesPath)) {
    strategies = loadYamlFile<Strategies>(strategiesPath);
  } else if (existsSync(packagedStrategies)) {
    strategies = loadYamlFile<Strategies>(packagedStrategies);
  }

  return {
    taxonomy,
    strategies,
    escalateLogPath: options?.escalateLogPath,
  };
}
