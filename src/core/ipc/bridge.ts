import type { IPCMessage, IPCMessageType } from '../../types';

const PROTOCOL_TAG = '__SKIP_AND_WAIT_IPC_V1__';

export class IPCBridge {
  private isMainWorld: boolean;
  private listeners: Map<IPCMessageType, Array<(payload: any) => void>> = new Map();

  constructor(isMainWorld: boolean) {
    this.isMainWorld = isMainWorld;
    this.init();
  }

  private init() {
    window.addEventListener('message', (event) => {
      // Must be same origin (within window context)
      if (event.source !== window) return;

      const data = event.data;
      if (!data || data._protocol !== PROTOCOL_TAG) return;

      // Ensure message came from the opposite world
      const expectedSource = this.isMainWorld ? 'SKIP_AND_WAIT_ISOLATED' : 'SKIP_AND_WAIT_MAIN';
      if (data.source !== expectedSource) return;

      const handlers = this.listeners.get(data.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(data.payload);
          } catch (e) {
            console.error(`[Skip & Wait IPC] Error in handler for ${data.type}:`, e);
          }
        });
      }
    });
  }

  public send<T = any>(type: IPCMessageType, payload?: T) {
    const message: IPCMessage<T> & { _protocol: string } = {
      _protocol: PROTOCOL_TAG,
      source: this.isMainWorld ? 'SKIP_AND_WAIT_MAIN' : 'SKIP_AND_WAIT_ISOLATED',
      type,
      payload,
    };
    window.postMessage(message, '*');
  }

  public on<T = any>(type: IPCMessageType, handler: (payload: T) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
  }
}
