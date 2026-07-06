import { getOpenApiYaml } from '../../contracts/openapi.js';
import { createApiHandler } from '../../middleware/api-handler.js';

export const handler = createApiHandler(async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/yaml; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
  },
  body: getOpenApiYaml(),
}));
