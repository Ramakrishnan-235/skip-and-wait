import type { IPCMessage, IPCMessageType } from '../../types';

const PROTOCOL_TAG = '__SKIP_AND_WAIT_IPC_V1__';

export class IPCBridge {
  private isMainWorld: boolean;
  private listeners: Map<IPCMessageType, Array<(payload: any) => void>> = new Map();
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(isMainWorld: boolean) {
    this.isMainWorld = isMainWorld;
    this.init();
  }

  private init() {
    this.messageListener = (event: MessageEvent) => {
      // Must be same origin (within window context)
      const isCurrentWindow =
        !event.source ||
        event.source === window ||
        (event.source as any) === globalThis ||
        (event.source as any)?.constructor?.name === 'GlobalWindow';
      if (!isCurrentWindow) return;

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
    };

    window.addEventListener('message', this.messageListener);
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

  public on<T = any>(type: IPCMessageType, handler: (payload: T) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);
    return () => this.off(type, handler);
  }

  public off<T = any>(type: IPCMessageType, handler: (payload: T) => void) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      this.listeners.set(
        type,
        handlers.filter((h) => h !== handler)
      );
    }
  }

  public destroy() {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }
    this.listeners.clear();
  }
}

