#!/usr/bin/env node

import { Command } from 'commander';
import { generateMCPServer } from './generator';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('lightning-mcp')
  .description('Generate MCP servers from Swagger/OpenAPI documents')
  .version('1.0.0');

program
  .requiredOption('--doc <path>', 'Path to Swagger/OpenAPI JSON document')
  .option(
    '--output <path>',
    'Output directory for generated MCP server',
    './generated-mcp-server',
  )
  .option('--config <path>', 'Path to template configuration file')
  .action(async (options) => {
    try {
      const { doc, output, config } = options;

      if (!fs.existsSync(doc)) {
        console.error(`Error: Swagger document not found at ${doc}`);
        process.exit(1);
      }

      const swaggerDoc = JSON.parse(fs.readFileSync(doc, 'utf8'));

      console.log(`Generating MCP server from ${doc}...`);
      await generateMCPServer(swaggerDoc, output, config);
      console.log(
        `MCP server generated successfully at ${path.resolve(output)}`,
      );
    } catch (error) {
      console.error('Error generating MCP server:', error);
      process.exit(1);
    }
  });

program.parse();
