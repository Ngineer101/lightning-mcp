# Lightning MCP

A CLI tool that generates a Model Context Protocol (MCP) server from a Swagger/OpenAPI document.

## Features

- 🚀 Generate a fully functional MCP server from a Swagger/OpenAPI JSON document
- 📝 Automatically create TypeScript API types from schemas
- 🔧 Support for all HTTP methods and parameter types (query, path, header, body)
- 📡 Built-in stdio transport for MCP communication
- 🎯 Each API endpoint becomes an MCP tool with proper descriptions and input schemas
- 📦 Generates complete project structure with build configuration

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

## Usage

### Basic Usage

```bash
node dist/cli.js --doc <swagger-json-path-or-url> [--output <output-directory>]
```

### Examples

```bash
# Generate MCP server from a local Swagger document
node dist/cli.js --doc api-spec.json --output my-api-server

# Generate from a remote URL
node dist/cli.js --doc https://petstore.swagger.io/v2/swagger.json --output petstore-server

# Use default output directory (./generated-mcp-server)
node dist/cli.js --doc api-spec.json
```

### Options

- `--doc <path>`: Path or URL to Swagger/OpenAPI JSON document (required)
- `--output <path>`: Output directory for generated MCP server (default: `./generated-mcp-server`)
- `--help`: Display help information
- `--version`: Display version information

## Generated MCP Server

The generated MCP server includes:

- **`src/index.ts`**: Main MCP server implementation with tools for each API endpoint
- **`src/types.ts`**: TypeScript types generated from Swagger schemas
- **`package.json`**: Node.js package configuration with dependencies
- **`tsconfig.json`**: TypeScript compilation configuration
- **`README.md`**: Documentation for the generated server

### Running the Generated Server

```bash
cd <output-directory>
npm install
npm run build
npm start
```

The server runs on stdio transport and can be used with any MCP-compatible client.

## How It Works

1. **Parse Swagger**: Reads and validates the provided Swagger/OpenAPI document
2. **Extract Endpoints**: Identifies all API endpoints with their methods, parameters, and schemas
3. **Generate Types**: Creates TypeScript interfaces and types from Swagger schemas
4. **Create Tools**: Maps each API endpoint to an MCP tool with proper input validation
5. **Build Server**: Generates a complete MCP server with stdio transport
6. **Package Project**: Creates a buildable Node.js project with all necessary files

## API Endpoint Mapping

Each API endpoint in your Swagger document becomes an MCP tool:

- **Tool Name**: Uses the `operationId` from Swagger, or generates one from method + path
- **Description**: Uses the `summary` or `description` from the endpoint
- **Input Schema**: Combines query parameters, path parameters, headers, and request body
- **HTTP Handling**: Properly constructs HTTP requests with all parameters and headers

### Parameter Support

- **Query Parameters**: Added to the request URL
- **Path Parameters**: Substituted in the URL path
- **Header Parameters**: Added to request headers
- **Request Body**: Sent as JSON in the request body
- **Response Handling**: Returns the full HTTP response including status, headers, and data

## Examples

### Input Swagger Document

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "User API",
    "version": "1.0.0"
  },
  "paths": {
    "/users/{id}": {
      "get": {
        "operationId": "getUserById",
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ]
      }
    }
  }
}
```

### Generated MCP Tool

The above endpoint becomes an MCP tool named `getUserById` with:
- Description: "Get user by ID"
- Input schema requiring an `id` string parameter
- HTTP GET request to `/users/{id}` with path parameter substitution

## Development

### Project Structure

```
lightning-mcp/
├── src/
│   ├── cli.ts           # CLI entry point
│   ├── parser.ts        # Swagger document parser
│   ├── generator.ts     # MCP server generator
│   ├── type-generator.ts # TypeScript type generator
│   └── templates.ts     # Code templates
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Scripts

- `npm run build`: Compile TypeScript to JavaScript
- `npm run dev`: Run CLI in development mode with tsx
- `npm run lint`: Run ESLint
- `npm run typecheck`: Run TypeScript type checking

## Requirements

- Node.js 18+ 
- TypeScript 5+
- Swagger/OpenAPI 3.0+ documents

## TODO

- Add optional parameter for initializing a git repository at the output directory
- Add optional parameter for specifying the transport type (stdio, http, etc.)
- Add tests for the CLI
- Add support for authentication (e.g. API keys, OAuth)
