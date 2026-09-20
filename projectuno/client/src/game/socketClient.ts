import { io, Socket } from 'socket.io-client';
import { Card, CardColor, GameState, PlayerRoomInfo } from '../../../shared/types';

export type EventCallback = (...args: any[]) => void;

export class SocketClient {
  private socket: Socket | null = null;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();

  connect(serverUrl: string = 'http://localhost:3001'): void {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.emit('client:connected', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Forward all events to registered listeners
    this.socket.onAny((eventName, ...args) => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(...args);
          } catch (err) {
            console.error(`Error in listener for ${eventName}:`, err);
          }
        });
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners.clear();
  }

  // Room events
  createRoom(playerName: string): void {
    this.socket?.emit('room:create', playerName);
  }

  joinRoom(roomId: string, playerName: string): void {
    this.socket?.emit('room:join', roomId, playerName);
  }

  leaveRoom(): void {
    this.socket?.emit('room:leave');
  }

  setReady(ready: boolean): void {
    this.socket?.emit('room:ready', ready);
  }

  startGame(): void {
    this.socket?.emit('room:start_game');
  }

  // Game events
  playCard(cardId: string, chosenColor?: CardColor): void {
    this.socket?.emit('game:play_card', cardId, chosenColor);
  }

  drawCard(): void {
    this.socket?.emit('game:draw_card');
  }

  chooseColor(color: CardColor): void {
    this.socket?.emit('game:choose_color', color);
  }

  callUno(): void {
    this.socket?.emit('game:call_uno');
  }

  passTurn(): void {
    this.socket?.emit('game:pass_turn');
  }

  // Event registration
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const socketClient = new SocketClient();