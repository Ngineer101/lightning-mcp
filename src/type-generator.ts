import * as fs from 'fs';
import * as path from 'path';
import { ParsedAPI } from './parser';

export function generateTypesFromSchema(schema: any, name: string): string {
  if (!schema) return 'any';

  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        return schema.enum
          .map((e: string) => {
            // Use JSON.stringify to handle all special characters properly
            return JSON.stringify(e);
          })
          .join(' | ');
      }
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      if (schema.items) {
        return `Array<${generateTypesFromSchema(schema.items, name + 'Item')}>`;
      }
      return 'any[]';
    case 'object':
      if (schema.properties && Object.keys(schema.properties).length > 0) {
        const props = Object.entries(schema.properties)
          .map(([key, prop]: [string, any]) => {
            const optional =
              schema.required && schema.required.includes(key) ? '' : '?';
            const safeKey = key.includes('-') ? `"${key}"` : key;
            return `  ${safeKey}${optional}: ${generateTypesFromSchema(prop, key)}`;
          })
          .join(';\n');
        return `{\n${props};\n}`;
      }
      return 'Record<string, any>';
    default:
      if (schema.$ref) {
        const refName = schema.$ref.split('/').pop();
        return refName;
      }
      return 'any';
  }
}

export function generateAPITypes(parsedAPI: ParsedAPI): string {
  let types = '';

  // Generate schema types
  for (const [schemaName, schema] of Object.entries(parsedAPI.schemas)) {
    const schemaType = generateTypesFromSchema(schema, schemaName);
    // Use interface for non-empty objects, type for everything else
    if (
      schemaType.startsWith('{') &&
      !schemaType.includes('Array<') &&
      schemaType !== 'Record<string, any>'
    ) {
      types += `export interface ${schemaName} ${schemaType}\n\n`;
    } else {
      types += `export type ${schemaName} = ${schemaType};\n\n`;
    }
  }

  // Generate endpoint parameter and response types
  for (const endpoint of parsedAPI.endpoints) {
    // Sanitize operation ID by replacing hyphens and spaces with underscores, then convert to PascalCase
    const sanitizedOperationId = endpoint.operationId
      .replace(/[-\s]+/g, '_') // Replace hyphens and spaces with underscores
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace any other special characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    const operationName =
      sanitizedOperationId.charAt(0).toUpperCase() +
      sanitizedOperationId.slice(1);

    // Parameters type
    if (endpoint.parameters.length > 0) {
      types += `export interface ${operationName}Params {\n`;
      for (const param of endpoint.parameters) {
        const optional = param.required ? '' : '?';
        const safeParamName = param.name.includes('-')
          ? `"${param.name}"`
          : param.name;
        types += `  ${safeParamName}${optional}: ${generateTypesFromSchema(param.schema, param.name)};\n`;
      }
      types += '}\n\n';
    }

    // Request body type
    if (endpoint.requestBody) {
      const jsonContent = endpoint.requestBody.content['application/json'];
      if (jsonContent && jsonContent.schema) {
        const schemaType = generateTypesFromSchema(
          jsonContent.schema,
          operationName + 'RequestBody',
        );
        if (
          schemaType.startsWith('{') &&
          !schemaType.includes('Array<') &&
          schemaType !== 'Record<string, any>'
        ) {
          types += `export interface ${operationName}RequestBody ${schemaType}\n\n`;
        } else {
          types += `export type ${operationName}RequestBody = ${schemaType};\n\n`;
        }
      }
    }

    // Response types
    for (const [statusCode, response] of Object.entries(endpoint.responses)) {
      if (response.content) {
        const jsonContent = response.content['application/json'];
        if (jsonContent && jsonContent.schema) {
          const schemaType = generateTypesFromSchema(
            jsonContent.schema,
            operationName + 'Response' + statusCode,
          );
          if (
            schemaType.startsWith('{') &&
            !schemaType.includes('Array<') &&
            schemaType !== 'Record<string, any>'
          ) {
            types += `export interface ${operationName}Response${statusCode} ${schemaType}\n\n`;
          } else {
            types += `export type ${operationName}Response${statusCode} = ${schemaType};\n\n`;
          }
        }
      }
    }
  }

  return types;
}

export function writeTypesToFile(types: string, outputPath: string): void {
  const typesPath = path.join(outputPath, 'types.ts');
  fs.writeFileSync(typesPath, types, 'utf8');
}
