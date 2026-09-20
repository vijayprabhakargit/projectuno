import { v4 as uuidv4 } from 'uuid';
import { Room, PlayerRoomInfo } from '../../shared/types';
import { UnoGame } from '../game/game';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(adminId: string, adminName: string): string {
    const roomId = this.generateRoomCode();
    const room: Room = {
      id: roomId,
      adminId,
      players: [{
        id: adminId,
        name: adminName,
        isAdmin: true,
        isReady: false
      }],
      gameState: null,
      phase: 'lobby'
    };
    this.rooms.set(roomId, room);
    return roomId;
  }

  joinRoom(roomId: string, playerId: string, playerName: string): { success: boolean; message: string; room?: Room } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found!' };
    }

    if (room.phase === 'game') {
      return { success: false, message: 'Game already in progress!' };
    }

    if (room.players.length >= 10) {
      return { success: false, message: 'Room is full!' };
    }

    if (room.players.some(p => p.id === playerId)) {
      return { success: false, message: 'You are already in this room!' };
    }

    room.players.push({
      id: playerId,
      name: playerName,
      isAdmin: false,
      isReady: false
    });

    return { success: true, message: 'Joined room!', room };
  }

  leaveRoom(roomId: string, playerId: string): { success: boolean; message: string; newAdminId?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found!' };
    }

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, message: 'Player not in room!' };
    }

    const wasAdmin = room.players[playerIndex].isAdmin;
    room.players.splice(playerIndex, 1);

    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { success: true, message: 'Room deleted!' };
    }

    // Transfer admin if needed
    if (wasAdmin && room.players.length > 0) {
      room.players[0].isAdmin = true;
      room.adminId = room.players[0].id;
      return { success: true, message: 'Left room!', newAdminId: room.players[0].id };
    }

    return { success: true, message: 'Left room!' };
  }

  setReady(roomId: string, playerId: string, ready: boolean): { success: boolean; message: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found!' };

    const player = room.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Player not in room!' };

    player.isReady = ready;
    return { success: true, message: `Ready status: ${ready}` };
  }

  startGame(roomId: string, playerId: string): { success: boolean; message: string; gameState?: any } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'Room not found!' };

    if (playerId !== room.adminId) {
      return { success: false, message: 'Only the admin can start the game!' };
    }

    if (room.players.length < 2) {
      return { success: false, message: 'Need at least 2 players!' };
    }

    // Start the game
    const playerList = room.players.map(p => ({ id: p.id, name: p.name }));
    const game = new UnoGame(playerList);
    room.gameState = game.getState();
    room.phase = 'game';

    return { success: true, message: 'Game started!', gameState: room.gameState };
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  removePlayerFromAllRooms(playerId: string): void {
    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          this.rooms.delete(roomId);
        }
      }
    }
  }

  private generateRoomCode(): string {
    // Generate a short, readable 4-character room code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }
}