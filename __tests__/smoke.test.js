import { describe, it, expect, vi } from 'vitest';

// Mock `mirador` so importing the plugin doesn't load the full browser bundle
// (which triggers a jsdom HTMLCanvasElement.getContext error).
vi.mock('mirador', () => ({
  getCanvas: vi.fn(),
  getCanvases: vi.fn(),
  getWindowIds: vi.fn(),
  setCanvas: vi.fn(),
}));

import plugins, { MiradorURLSyncPlugin } from '../src/index.js';

describe('mirador-url-sync-plugin smoke test', () => {
  it('exports the url sync plugin', () => {
    expect(MiradorURLSyncPlugin).toBeDefined();
  });

  it('exports an array of plugins as the default export', () => {
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins).toHaveLength(1);
    expect(plugins).toContain(MiradorURLSyncPlugin);
  });

  it('configures the plugin with a target and component', () => {
    expect(typeof MiradorURLSyncPlugin.target).toBe('string');
    expect(MiradorURLSyncPlugin.target.length).toBeGreaterThan(0);
    expect(MiradorURLSyncPlugin.component).toBeDefined();
  });

  it('registers the plugin against the Window in add mode with a saga', () => {
    expect(MiradorURLSyncPlugin.target).toBe('Window');
    expect(MiradorURLSyncPlugin.mode).toBe('add');
    expect(typeof MiradorURLSyncPlugin.saga).toBe('function');
  });
});
