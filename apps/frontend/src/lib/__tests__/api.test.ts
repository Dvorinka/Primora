import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAPI } from '@primora/api-client';

describe('API Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should configure base URL from environment', () => {
    expect(OpenAPI.BASE).toBeDefined();
    expect(OpenAPI.BASE).toContain('/api/v1');
  });

  it('should include credentials in requests', () => {
    expect(OpenAPI.CREDENTIALS).toBe('include');
    expect(OpenAPI.WITH_CREDENTIALS).toBe(true);
  });

  it('should have token resolver configured', () => {
    expect(OpenAPI.TOKEN).toBeDefined();
    expect(typeof OpenAPI.TOKEN).toBe('function');
  });
});
