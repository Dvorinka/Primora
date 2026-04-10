import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost/api/v1');
vi.stubEnv('VITE_AUTH_BASE_URL', 'http://localhost/auth');
vi.stubEnv('VITE_APP_URL', 'http://localhost');

// Mock fetch globally
global.fetch = vi.fn();
