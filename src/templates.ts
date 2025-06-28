export function createMCPServerTemplate(config: any) {
  return `#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const server = new Server(
  {
    name: '{{apiTitle}}',
    version: '{{apiVersion}}',
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
{{#each tools}}
      {
        name: '{{name}}',
        description: '{{description}}',
        inputSchema: {
          type: 'object',
          properties: {
{{#each parameters}}
            {{name}}: {
              type: '{{type}}',
              description: '{{description}}'{{#if required}},
              required: true{{/if}}
            },
{{/each}}
{{#if requestBody}}
            requestBody: {
              type: 'object',
              description: '{{requestBody.description}}'{{#if requestBody.required}},
              required: true{{/if}}
            }
{{/if}}
          }
        }
      }{{#unless @last}},{{/unless}}
{{/each}}
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
{{#each tools}}
      case '{{name}}': {
        const url = \`{{baseUrl}}{{path}}\`;
        const method = '{{method}}';
        
        // Prepare request config
        const config: any = {
          method,
          url,
        };
        
        // Add query parameters
        const queryParams: any = {};
{{#each parameters}}
{{#if (eq in 'query')}}
        if (args && args.{{name}} !== undefined) {
          queryParams.{{name}} = args.{{name}};
        }
{{/if}}
{{/each}}
        
        if (Object.keys(queryParams).length > 0) {
          config.params = queryParams;
        }
        
        // Add path parameters
        let finalUrl = url;
{{#each parameters}}
{{#if (eq in 'path')}}
        if (args && args.{{name}} !== undefined) {
          finalUrl = finalUrl.replace('{{{name}}}', String(args.{{name}}));
        }
{{/if}}
{{/each}}
        config.url = finalUrl;
        
        // Add headers
        const headers: any = {};
{{#each parameters}}
{{#if (eq in 'header')}}
        if (args && args.{{name}} !== undefined) {
          headers['{{name}}'] = args.{{name}};
        }
{{/if}}
{{/each}}
        
        if (Object.keys(headers).length > 0) {
          config.headers = headers;
        }
        
        // Add request body
{{#if requestBody}}
        if (args && args.requestBody !== undefined) {
          config.data = args.requestBody;
          if (!config.headers) config.headers = {};
          config.headers['Content-Type'] = '${config.constants.contentType}';
        }
{{/if}}
        
        const response = await axios(config);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: response.status,
                statusText: response.statusText,
                data: response.data,
                headers: response.headers
              }, null, 2)
            }
          ]
        };
      }
{{/each}}
      default:
        throw new Error(\`Unknown tool: \${name}\`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: \`Error calling \${name}: \${errorMessage}\`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('{{apiTitle}} MCP server running on stdio');
}

main().catch(console.error);
`;
}

export function createPackageJsonTemplate(config: any) {
  return `{
  "name": "{{packageName}}",
  "version": "1.0.0",
  "description": "MCP server for {{apiTitle}}",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "{{packageName}}": "dist/index.js"
  },
  "scripts": {
    "build": "${config.scripts.build}",
    "start": "${config.scripts.start}",
    "dev": "${config.scripts.dev}"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "${config.dependencies.mcpSdk}",
    "axios": "${config.dependencies.axios}"
  },
  "devDependencies": {
    "@types/node": "${config.devDependencies.typesNode}",
    "tsx": "${config.devDependencies.tsx}",
    "typescript": "${config.devDependencies.typescript}"
  }
}`;
}

export function createTsConfigTemplate(config: any) {
  return `{
  "compilerOptions": {
    "target": "${config.constants.defaultNodeTarget}",
    "module": "${config.constants.defaultModuleSystem}",
    "moduleResolution": "${config.constants.defaultModuleResolution}",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;
}

export function createReadmeTemplate() {
  return `# {{apiTitle}} MCP Server

This is a Model Context Protocol (MCP) server generated from the {{apiTitle}} API specification.

## Installation

\`\`\`bash
npm install
npm run build
\`\`\`

## Usage

\`\`\`bash
npm start
\`\`\`

## Available Tools

{{#each tools}}
### {{name}}

{{description}}

**Method:** {{method}}
**Path:** {{path}}

{{#if parameters}}
**Parameters:**
{{#each parameters}}
- \`{{name}}\` ({{in}}) - {{description}}{{#if required}} *Required*{{/if}}
{{/each}}
{{/if}}

{{#if requestBody}}
**Request Body:** {{requestBody.description}}{{#if requestBody.required}} *Required*{{/if}}
{{/if}}

{{/each}}
`;
}
