/**
 * Neon Realtime WebSocket Client for CitizenCivic.
 * Connects to the Neon Realtime WebSocket endpoint to provide live case status
 * updates, notifications, and instant workflow feedback.
 */

export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface RealtimeMessage {
  type: 'CASE_STATUS_CHANGED' | 'CASE_CREATED' | 'OBSERVATION_ADDED' | 'DISPUTE_RAISED' | 'PING';
  case_id?: string;
  case_number?: string;
  new_status?: string;
  actor_name?: string;
  timestamp: string;
  data?: any;
}

export type RealtimeListener = (message: RealtimeMessage) => void;

class NeonRealtimeClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Set<RealtimeListener> = new Set();
  private statusListeners: Set<(status: RealtimeStatus) => void> = new Set();
  private status: RealtimeStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;

  constructor() {
    const rawUrl =
      import.meta.env.VITE_NEON_REALTIME_WS ||
      import.meta.env.VITE_NEON_REALTIME_URL ||
      '';

    if (rawUrl) {
      // Ensure wss:// scheme
      this.url = rawUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      if (!this.url.endsWith('/')) {
        this.url += '/';
      }
    } else {
      this.url = '';
    }
  }

  public connect(): void {
    if (!this.url) {
      return;
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        console.log('[Neon-Realtime] WebSocket connected to', this.url);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed: RealtimeMessage = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch {
          // Non-JSON or protocol message
        }
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[Neon-Realtime] Connection notice:', err);
        // Browser WebSockets will call onclose next
      };
    } catch (err) {
      console.warn('[Neon-Realtime] Socket initialization:', err);
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  public disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('DISCONNECTED');
  }

  public getStatus(): RealtimeStatus {
    return this.status;
  }

  private setStatus(status: RealtimeStatus): void {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  public onStatusChange(fn: (status: RealtimeStatus) => void): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(message: RealtimeMessage): void {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('[Neon-Realtime] Listener exception', err);
      }
    });
  }

  /**
   * Broadcast a local simulated transition event so other components
   * on the page react instantly even in offline or fallback modes.
   */
  public broadcastLocalEvent(message: RealtimeMessage): void {
    this.notifyListeners(message);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch {
        // Best effort
      }
    }
  }
}

export const realtimeClient = new NeonRealtimeClient();
export default realtimeClient;
