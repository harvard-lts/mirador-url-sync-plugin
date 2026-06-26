import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { select, put } from 'redux-saga/effects';

// Mock `mirador` so importing the plugin doesn't load the full browser bundle
// (which triggers a jsdom HTMLCanvasElement.getContext error). The selectors
// are passed by reference to `select(...)`, so identity is all that matters.
vi.mock('mirador', () => ({
  getCanvas: vi.fn(),
  getCanvases: vi.fn(),
  getWindowIds: vi.fn(),
  setCanvas: vi.fn((windowId, canvasId) => ({
    type: 'mirador/SET_CANVAS', windowId, canvasId,
  })),
}));

const {
  getCanvas, getCanvases, getWindowIds, setCanvas,
} = await import('mirador');
const { default: plugin } = await import('../src/plugins/MiradorURLSyncPlugin.js');

describe('mirador-url-sync-plugin saga', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/viewer');
  });

  it('exposes a generator saga and the plugin descriptor', () => {
    expect(typeof plugin.saga).toBe('function');
    expect(plugin.target).toBe('Window');
    expect(plugin.mode).toBe('add');
    expect(plugin.component()).toBeNull();
  });

  it('watches the SET_CANVAS action', () => {
    const root = plugin.saga();
    const effect = root.next().value; // takeEvery(...) FORK effect
    expect(effect.payload.args[0]).toBe('mirador/SET_CANVAS');
  });

  it('ignores SET_CANVAS from a non-primary window', () => {
    const action = { canvasId: 'c1', windowId: 'w2' };
    const worker = runWorker(action);
    // First yield: select(getWindowIds)
    expect(worker.next().value).toEqual(select(getWindowIds));
    // Provide window ids where w2 is NOT the primary window → saga returns early
    expect(worker.next(['w1']).done).toBe(true);
    expect(window.location.search).toBe('');
  });

  it('updates the URL for the primary window when the canvas resolves', () => {
    const action = { canvasId: 'c1', windowId: 'w1' };
    const worker = runWorker(action);

    expect(worker.next().value).toEqual(select(getWindowIds));
    // w1 is primary → continues; next yields select(getCanvas, ...)
    expect(worker.next(['w1']).value).toEqual(
      select(getCanvas, { canvasId: 'c1', windowId: 'w1' }),
    );
    // Canvas resolves → no setCanvas dispatch, just URL update
    const done = worker.next({ id: 'c1' });
    expect(done.done).toBe(true);
    expect(new URLSearchParams(window.location.search).get('canvasId')).toBe('c1');
  });

  it('falls back to the first available canvas when the target is missing', () => {
    const action = { canvasId: 'bad', windowId: 'w1' };
    const worker = runWorker(action);

    expect(worker.next().value).toEqual(select(getWindowIds));
    expect(worker.next(['w1']).value).toEqual(
      select(getCanvas, { canvasId: 'bad', windowId: 'w1' }),
    );
    // No matching canvas → fetch available canvases
    expect(worker.next(undefined).value).toEqual(
      select(getCanvases, { windowId: 'w1' }),
    );
    // Dispatch setCanvas to the first available canvas
    expect(worker.next([{ id: 'first' }]).value).toEqual(
      put(setCanvas('w1', 'first')),
    );
    expect(worker.next().done).toBe(true);
  });
});

// Pull the worker generator out of the saga's takeEvery effect description.
function runWorker(action) {
  const root = plugin.saga();
  const { value } = root.next();
  const worker = value.payload.args[1];
  return worker(action);
}
