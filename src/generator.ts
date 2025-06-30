import * as fs from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import { parseSwaggerDoc, ParsedEndpoint } from './parser';
import { generateAPITypes, writeTypesToFile } from './type-generator';
import {
  createMCPServerTemplate,
  createPackageJsonTemplate,
  createTsConfigTemplate,
  createReadmeTemplate,
} from './templates';
import { getTemplateConfig } from './config';
import { spawn } from 'child_process';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a, b) => {
  return a === b;
});

interface MCPTool {
  name: string;
  description: string;
  method: string;
  path: string;
  parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    in: string;
  }>;
  requestBody?: {
    description: string;
    required: boolean;
  };
}

function convertSchemaTypeToSimpleType(
  schema: Record<string, unknown> | undefined,
): string {
  if (!schema) return 'string';

  switch (schema.type) {
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'array';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

function createMCPToolsFromEndpoints(endpoints: ParsedEndpoint[]): MCPTool[] {
  return endpoints.map((endpoint) => ({
    name: endpoint.operationId,
    description:
      endpoint.description ||
      endpoint.summary ||
      `${endpoint.method.toUpperCase()} ${endpoint.path}`,
    method: endpoint.method.toUpperCase(),
    path: endpoint.path,
    parameters: endpoint.parameters.map((param) => ({
      name: param.name,
      type: convertSchemaTypeToSimpleType(
        param.schema as Record<string, unknown>,
      ),
      description: param.description || `${param.name} parameter`,
      required: param.required,
      in: param.in,
    })),
    requestBody: endpoint.requestBody
      ? {
          description: endpoint.requestBody.description || 'Request body',
          required: endpoint.requestBody.required,
        }
      : undefined,
  }));
}

export async function generateMCPServer(
  swaggerDoc: Record<string, unknown>,
  outputDir: string,
  configPath?: string,
): Promise<void> {
  const parsedAPI = await parseSwaggerDoc(swaggerDoc);
  const tools = createMCPToolsFromEndpoints(parsedAPI.endpoints);
  const config = getTemplateConfig(configPath);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const srcDir = path.join(outputDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  // Generate base URL from servers
  const baseUrl =
    parsedAPI.servers.length > 0
      ? parsedAPI.servers[0].url
      : 'http://localhost';

  // Compile templates
  const serverTemplate = Handlebars.compile(createMCPServerTemplate(config));
  const packageTemplate = Handlebars.compile(createPackageJsonTemplate(config));
  const readmeTemplate = Handlebars.compile(createReadmeTemplate());

  const packageName =
    parsedAPI.info.title.toLowerCase().replace(/[^a-z0-9]/g, '-') +
    '-mcp-server';

  // Generate server code
  const serverCode = serverTemplate({
    apiTitle: parsedAPI.info.title,
    apiVersion: parsedAPI.info.version,
    baseUrl,
    tools,
  });

  // Generate package.json
  const packageJson = packageTemplate({
    packageName,
    apiTitle: parsedAPI.info.title,
  });

  // Generate README
  const readme = readmeTemplate({
    apiTitle: parsedAPI.info.title,
    tools,
  });

  // Write files
  fs.writeFileSync(path.join(srcDir, 'index.ts'), serverCode);
  fs.writeFileSync(path.join(outputDir, 'package.json'), packageJson);
  fs.writeFileSync(
    path.join(outputDir, 'tsconfig.json'),
    createTsConfigTemplate(config),
  );
  fs.writeFileSync(path.join(outputDir, 'README.md'), readme);

  // Generate TypeScript types
  const types = generateAPITypes(parsedAPI);
  writeTypesToFile(types, srcDir);

  console.log(`Generated MCP server with ${tools.length} tools`);
  tools.forEach((tool) => console.log(`  - ${tool.name}: ${tool.description}`));

  // Install dependencies and build the generated app to ensure it's working
  console.log('Installing dependencies...');
  const installProcess = spawn('npm', ['install'], {
    cwd: outputDir,
    stdio: 'inherit',
  });

  installProcess.on('close', (installCode: number) => {
    if (installCode === 0) {
      console.log('✅ Dependencies installed successfully');
      console.log('Building generated MCP server...');

      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: outputDir,
        stdio: 'inherit',
      });

      buildProcess.on('close', (buildCode: number) => {
        if (buildCode === 0) {
          console.log('✅ Build completed successfully');
        } else {
          console.error(`❌ Build failed with exit code ${buildCode}`);
        }
      });
    } else {
      console.error(
        `❌ Dependency installation failed with exit code ${installCode}`,
      );
    }
  });
}
