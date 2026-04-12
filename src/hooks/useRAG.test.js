import { describe, it, expect } from 'vitest';
import { retrieveChunks } from './useRAG';

describe('retrieveChunks', () => {
  it('returns empty string when documentIds is empty', async () => {
    const result = await retrieveChunks('revenue trends', []);
    expect(result).toBe('');
  });

  it('returns empty string when query is empty', async () => {
    const result = await retrieveChunks('', ['doc-1']);
    expect(result).toBe('');
  });
});
