#!/usr/bin/env node

import { Command } from 'commander';
import { generateMCPServer } from './generator';
import * as fs from 'fs';
import * as path from 'path';
import https from 'node:https';
import http from 'node:http';

const program = new Command();

program
  .name('mcpr')
  .description('Generate MCP servers from Swagger/OpenAPI documents')
  .version('0.0.1');

program
  .requiredOption(
    '--doc <path>',
    'Path or URL to Swagger/OpenAPI JSON document',
  )
  .option(
    '--output <path>',
    'Output directory for generated MCP server',
    './generated-mcp-server',
  )
  .option('--config <path>', 'Path to template configuration file')
  .action(async (options) => {
    try {
      const { doc, output, config } = options;

      let swaggerDoc: Record<string, unknown>;

      if (doc.startsWith('http://') || doc.startsWith('https://')) {
        console.log(`Fetching Swagger document from ${doc}...`);
        swaggerDoc = await fetchSwaggerDoc(doc);
      } else {
        if (!fs.existsSync(doc)) {
          console.error(`Error: Swagger document not found at ${doc}`);
          process.exit(1);
        }
        swaggerDoc = JSON.parse(fs.readFileSync(doc, 'utf8'));
      }

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

async function fetchSwaggerDoc(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;

    client
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error}`));
          }
        });
      })
      .on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
  });
}

program.parse();
