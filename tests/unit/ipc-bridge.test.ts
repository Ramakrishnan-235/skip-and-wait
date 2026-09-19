import { describe, it, expect } from 'vitest';
import { IPCBridge } from '../../src/core/ipc/bridge';

describe('IPCBridge Cross-World Communication', () => {
  it('sends messages from MAIN world and receives them in ISOLATED world', async () => {
    const mainBridge = new IPCBridge(true);
    const isolatedBridge = new IPCBridge(false);

    let receivedPayload: any = null;
    isolatedBridge.on('TIMER_ACCELERATED', (payload) => {
      receivedPayload = payload;
    });

    mainBridge.send('TIMER_ACCELERATED', { secondsSaved: 12 });

    await new Promise((r) => setTimeout(r, 20));

    expect(receivedPayload).toEqual({ secondsSaved: 12 });
  });

  it('sends messages from ISOLATED world and receives them in MAIN world', async () => {
    const mainBridge = new IPCBridge(true);
    const isolatedBridge = new IPCBridge(false);

    let forceSkipReceived = false;
    mainBridge.on('FORCE_SKIP', () => {
      forceSkipReceived = true;
    });

    isolatedBridge.send('FORCE_SKIP');

    await new Promise((r) => setTimeout(r, 20));
    expect(forceSkipReceived).toBe(true);
  });

  it('ignores messages originating from the same world', async () => {
    const mainBridge = new IPCBridge(true);

    let receivedInMain = false;
    mainBridge.on('TIMER_ACCELERATED', () => {
      receivedInMain = true;
    });

    mainBridge.send('TIMER_ACCELERATED', { secondsSaved: 5 });

    await new Promise((r) => setTimeout(r, 20));
    expect(receivedInMain).toBe(false);
  });

  it('ignores messages with invalid or missing protocol tags', async () => {
    const isolatedBridge = new IPCBridge(false);

    let received = false;
    isolatedBridge.on('TIMER_ACCELERATED', () => {
      received = true;
    });

    window.postMessage({ type: 'TIMER_ACCELERATED', payload: { secondsSaved: 5 } }, '*');
    window.postMessage({ _protocol: 'OTHER_PROTOCOL', type: 'TIMER_ACCELERATED' }, '*');

    await new Promise((r) => setTimeout(r, 20));
    expect(received).toBe(false);
  });

  it('executes multiple listeners registered on the same event type', async () => {
    const mainBridge = new IPCBridge(true);
    const isolatedBridge = new IPCBridge(false);

    let handler1Called = false;
    let handler2Called = false;

    isolatedBridge.on('VIDEO_AD_SKIPPED', () => {
      handler1Called = true;
    });
    isolatedBridge.on('VIDEO_AD_SKIPPED', () => {
      handler2Called = true;
    });

    mainBridge.send('VIDEO_AD_SKIPPED', { secondsSaved: 15 });

    await new Promise((r) => setTimeout(r, 20));
    expect(handler1Called).toBe(true);
    expect(handler2Called).toBe(true);
  });

  it('continues executing other handlers if one handler throws an error', async () => {
    const mainBridge = new IPCBridge(true);
    const isolatedBridge = new IPCBridge(false);

    let handler2Called = false;

    isolatedBridge.on('TIMER_ACCELERATED', () => {
      throw new Error('Handler 1 crashed');
    });
    isolatedBridge.on('TIMER_ACCELERATED', () => {
      handler2Called = true;
    });

    mainBridge.send('TIMER_ACCELERATED', { secondsSaved: 5 });

    await new Promise((r) => setTimeout(r, 20));
    expect(handler2Called).toBe(true);
  });
});
