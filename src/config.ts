import * as fs from 'fs';
import * as path from 'path';

export interface TemplateConfig {
  dependencies: {
    mcpSdk: string;
    axios: string;
    [key: string]: string;
  };
  devDependencies: {
    typesNode: string;
    tsx: string;
    typescript: string;
    [key: string]: string;
  };
  constants: {
    defaultNodeTarget: string;
    defaultModuleSystem: string;
    defaultModuleResolution: string;
    contentType: string;
    httpMethods: string[];
    parameterTypes: string[];
  };
  scripts: {
    build: string;
    start: string;
    dev: string;
  };
}

const DEFAULT_CONFIG: TemplateConfig = {
  dependencies: {
    mcpSdk: '^1.13.2',
    axios: '^1.6.0',
  },
  devDependencies: {
    typesNode: '^20.10.0',
    tsx: '^4.6.0',
    typescript: '^5.3.0',
  },
  constants: {
    defaultNodeTarget: 'ES2020',
    defaultModuleSystem: 'ESNext',
    defaultModuleResolution: 'node',
    contentType: 'application/json',
    httpMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    parameterTypes: ['query', 'path', 'header', 'formData', 'body'],
  },
  scripts: {
    build: 'tsc',
    start: 'node dist/index.js',
    dev: 'tsx src/index.ts',
  },
};

export function loadConfig(configPath?: string): TemplateConfig {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return mergeConfig(DEFAULT_CONFIG, userConfig);
    } catch (error) {
      console.warn(
        `Warning: Failed to load config from ${configPath}, using defaults`,
      );
    }
  }

  return DEFAULT_CONFIG;
}

export function getVersionsFromCurrentProject(): Partial<
  TemplateConfig['dependencies']
> {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = packageJson.dependencies || {};

      const result: Partial<TemplateConfig['dependencies']> = {};
      if (deps['@modelcontextprotocol/sdk']) {
        result.mcpSdk = deps['@modelcontextprotocol/sdk'];
      }
      if (deps['axios']) {
        result.axios = deps['axios'];
      }
      return result;
    }
  } catch (error) {
    console.warn(
      'Warning: Could not read current project package.json, using defaults',
    );
  }

  return {};
}

function mergeConfig(
  defaultConfig: TemplateConfig,
  userConfig: any,
): TemplateConfig {
  return {
    dependencies: { ...defaultConfig.dependencies, ...userConfig.dependencies },
    devDependencies: {
      ...defaultConfig.devDependencies,
      ...userConfig.devDependencies,
    },
    constants: { ...defaultConfig.constants, ...userConfig.constants },
    scripts: { ...defaultConfig.scripts, ...userConfig.scripts },
  };
}

export function getTemplateConfig(configPath?: string): TemplateConfig {
  const baseConfig = loadConfig(configPath);
  const projectVersions = getVersionsFromCurrentProject();

  return {
    ...baseConfig,
    dependencies: {
      ...baseConfig.dependencies,
      ...(Object.fromEntries(
        Object.entries(projectVersions).filter(
          ([_, value]) => value !== undefined,
        ),
      ) as TemplateConfig['dependencies']),
    },
  };
}
