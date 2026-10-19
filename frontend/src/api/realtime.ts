/**
 * Realtime Event Client for CitizenCivic.
 * Supports both standard Server-Sent Events (SSE) via the Express API (/api/v1/cases/events)
 * and optional Neon WebSocket endpoints.
 * Provides authentic, database-backed live event updates with zero simulated activity.
 */

export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';

export interface RealtimeMessage {
  type: 'CASE_STATUS_CHANGED' | 'CASE_CREATED' | 'OBSERVATION_ADDED' | 'DISPUTE_RAISED' | 'CONNECTED' | 'PING';
  case_id?: string;
  case_number?: string;
  new_status?: string;
  actor_name?: string;
  timestamp: string;
  data?: any;
}

export type RealtimeListener = (message: RealtimeMessage) => void;

class RealtimeClient {
  private eventSource: EventSource | null = null;
  private ws: WebSocket | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private statusListeners: Set<(status: RealtimeStatus) => void> = new Set();
  private status: RealtimeStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;

  public connect(): void {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
      return;
    }

    const wsUrl = import.meta.env.VITE_NEON_REALTIME_WS || import.meta.env.VITE_NEON_REALTIME_URL;

    // 1. If explicit WebSocket URL configured, connect via WebSocket
    if (wsUrl) {
      this.connectWebSocket(wsUrl);
      return;
    }

    // 2. Otherwise connect via native HTTP Server-Sent Events (SSE)
    this.connectSSE();
  }

  private connectSSE(): void {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');
    const sseEndpoint = `${apiBase}/api/v1/cases/events`;

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.eventSource = new EventSource(sseEndpoint);

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const parsed: RealtimeMessage = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch {
          // Heartbeat or comment line
        }
      };

      this.eventSource.onerror = () => {
        this.setStatus('DISCONNECTED');
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        this.scheduleReconnect();
      };
    } catch {
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private connectWebSocket(rawUrl: string): void {
    const normalizedUrl = rawUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(normalizedUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const parsed: RealtimeMessage = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch {
          // Non-JSON protocol message
        }
      };

      this.ws.onclose = () => {
        this.setStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('DISCONNECTED');
      };
    } catch {
      this.setStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 20000);
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  public disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
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
        console.error('[Realtime] Listener exception', err);
      }
    });
  }

  /**
   * Broadcast an event to local listeners
   */
  public broadcastLocalEvent(message: RealtimeMessage): void {
    this.notifyListeners(message);
  }
}

export const realtimeClient = new RealtimeClient();
export default realtimeClient;
