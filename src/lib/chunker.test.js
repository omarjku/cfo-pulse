import { describe, it, expect } from 'vitest';
import { chunkText } from './chunker';

describe('chunkText', () => {
  it('returns single chunk for short text', () => {
    const chunks = chunkText('hello world', { size: 100, overlap: 20 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('hello world');
  });

  it('splits long text into overlapping chunks', () => {
    const text = 'a'.repeat(250);
    const chunks = chunkText(text, { size: 100, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(100));
  });

  it('overlapping chunks share characters', () => {
    const text = 'a'.repeat(150);
    const chunks = chunkText(text, { size: 100, overlap: 20 });
    expect(chunks.length).toBe(2);
    expect(chunks[1].length).toBe(70);
  });

  it('handles empty string', () => {
    expect(chunkText('', { size: 100, overlap: 20 })).toEqual([]);
  });

  it('uses default options', () => {
    const text = 'x'.repeat(2500);
    const chunks = chunkText(text);
    chunks.forEach(c => expect(c.length).toBeLessThanOrEqual(1000));
  });
});
