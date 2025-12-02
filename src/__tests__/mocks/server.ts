import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server for Node.js Environment (Vitest)
 *
 * This server intercepts HTTP requests during unit and integration tests.
 *
 * Usage in tests:
 * ```typescript
 * import { server } from '@/__tests__/mocks/server';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 */
export const server = setupServer(...handlers);
