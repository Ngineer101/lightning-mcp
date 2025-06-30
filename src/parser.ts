const SwaggerParser = require('swagger-parser');
import { OpenAPIV3 } from 'openapi-types';

export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

export interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined;
  description?: string;
}

export interface RequestBody {
  description?: string;
  required: boolean;
  content: Record<string, OpenAPIV3.MediaTypeObject>;
}

export interface Response {
  description: string;
  content?: Record<string, OpenAPIV3.MediaTypeObject>;
}

export interface ParsedAPI {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers: Array<{ url: string; description?: string }>;
  endpoints: ParsedEndpoint[];
  schemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>;
}

export async function parseSwaggerDoc(
  swaggerDoc: Record<string, unknown>,
): Promise<ParsedAPI> {
  const api = (await SwaggerParser.parse(swaggerDoc)) as OpenAPIV3.Document;

  const endpoints: ParsedEndpoint[] = [];

  for (const [path, pathItem] of Object.entries(api.paths || {})) {
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (
        !operation ||
        typeof operation !== 'object' ||
        !('responses' in operation)
      )
        continue;

      const op = operation as OpenAPIV3.OperationObject;

      const parameters: Parameter[] = [];
      if (op.parameters) {
        for (const param of op.parameters) {
          if ('$ref' in param) continue; // Skip refs for now
          const p = param as OpenAPIV3.ParameterObject;
          parameters.push({
            name: p.name,
            in: p.in as 'query' | 'path' | 'header' | 'cookie',
            required: p.required || false,
            schema: p.schema,
            description: p.description,
          });
        }
      }

      let requestBody: RequestBody | undefined;
      if (op.requestBody && !('$ref' in op.requestBody)) {
        const rb = op.requestBody as OpenAPIV3.RequestBodyObject;
        requestBody = {
          description: rb.description,
          required: rb.required || false,
          content: rb.content || {},
        };
      }

      const responses: Record<string, Response> = {};
      for (const [statusCode, response] of Object.entries(op.responses || {})) {
        if ('$ref' in response) continue; // Skip refs for now
        const res = response as OpenAPIV3.ResponseObject;
        responses[statusCode] = {
          description: res.description,
          content: res.content,
        };
      }

      endpoints.push({
        path,
        method: method.toLowerCase(),
        operationId:
          op.operationId ||
          `${method.toLowerCase()}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
        summary: op.summary,
        description: op.description,
        parameters,
        requestBody,
        responses,
      });
    }
  }

  return {
    info: {
      title: api.info.title,
      version: api.info.version,
      description: api.info.description,
    },
    servers: api.servers || [],
    endpoints,
    schemas: api.components?.schemas || {},
  };
}
