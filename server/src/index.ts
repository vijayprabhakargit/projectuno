import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/roomManager';
import { CardColor, PlayerRoomInfo } from '../../shared/types';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const roomManager = new RoomManager();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoomId: string | null = null;

  // ===== ROOM EVENTS =====

  // Create a new room
  socket.on('room:create', (playerName: string) => {
    const roomId = roomManager.createRoom(socket.id, playerName);
    currentRoomId = roomId;
    socket.join(roomId);

    const room = roomManager.getRoom(roomId);
    if (room) {
          socket.emit('room:joined', roomId, room.players);
          // Also send current scores
          if (Object.keys(room.scores).length > 0) {
            socket.emit('room:scores_update', room.scores);
          }
          console.log(`Room ${roomId} created by ${playerName}`);
    }
  });

  // Join an existing room
  socket.on('room:join', (roomId: string, playerName: string) => {
    const result = roomManager.joinRoom(roomId.toUpperCase(), socket.id, playerName);
    if (result.success && result.room) {
      currentRoomId = result.room.id;
      socket.join(result.room.id);
      
      // Notify the joining player
            socket.emit('room:joined', result.room.id, result.room.players);
            // Also send current scores to the joining player
            if (result.room.scores && Object.keys(result.room.scores).length > 0) {
              socket.emit('room:scores_update', result.room.scores);
            }
      
      // Notify all other players in the room
      socket.to(result.room.id).emit('room:player_joined', {
        id: socket.id,
        name: playerName,
        isAdmin: false,
        isReady: false
      });
      
      console.log(`${playerName} joined room ${result.room.id}`);
    } else {
      socket.emit('room:error', result.message);
    }
  });

  // Leave a room
  socket.on('room:leave', () => {
    if (currentRoomId) {
      const room = roomManager.getRoom(currentRoomId);
      const player = room?.players.find((p: PlayerRoomInfo) => p.id === socket.id);
      const playerName = player?.name || 'Unknown';
      
      const result = roomManager.leaveRoom(currentRoomId, socket.id);
      
      if (result.success) {
        socket.leave(currentRoomId);
        
        // Notify remaining players
        const updatedRoom = roomManager.getRoom(currentRoomId);
        if (updatedRoom) {
          socket.to(currentRoomId).emit('room:player_left', socket.id);
          if (result.newAdminId) {
            socket.to(currentRoomId).emit('room:player_ready', result.newAdminId, false);
          }
        }
        
        console.log(`${playerName} left room ${currentRoomId}`);
      }
      
      currentRoomId = null;
    }
  });

  // Toggle ready status
  socket.on('room:ready', (ready: boolean) => {
    if (currentRoomId) {
      const result = roomManager.setReady(currentRoomId, socket.id, ready);
      if (result.success) {
        // Broadcast to all players in the room
        io.to(currentRoomId).emit('room:player_ready', socket.id, ready);
      }
    }
  });

  // Start the game (admin only)
    socket.on('room:start_game', () => {
      if (currentRoomId) {
        const result = roomManager.startGame(currentRoomId, socket.id);
        if (result.success && result.gameState) {
                  const room = roomManager.getRoom(currentRoomId);
                  const game = roomManager.getGame(currentRoomId);
                  if (room && game) {
                    // Send individual game start to each player with their own hand
                    for (const player of room.players) {
                      const playerState = game.getPlayerState(player.id);
                      io.to(player.id).emit('game:started', {
                        ...playerState.publicState,
                        yourHand: playerState.hand
                      });
                    }
                  }
                  console.log(`Game started in room ${currentRoomId}`);
                } else {
                  socket.emit('room:error', result.message);
                }
              }
            });

          // Return to lobby after game ends
          socket.on('room:return_to_lobby', () => {
            if (currentRoomId) {
              const result = roomManager.resetRoomToLobby(currentRoomId);
              if (result.success) {
                const room = roomManager.getRoom(currentRoomId);
                if (room) {
                  // Notify all players to return to lobby
                  io.to(currentRoomId).emit('room:returned_to_lobby', room.players, room.scores);
                  // Also emit scores update
                  io.to(currentRoomId).emit('room:scores_update', room.scores);
                }
                console.log(`Room ${currentRoomId} returned to lobby`);
              }
            }
          });

  // ===== GAME EVENTS =====

  // Play a card
  socket.on('game:play_card', (cardId: string, chosenColor?: CardColor) => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.gameState || room.phase !== 'game') return;

    // Reconstruct the game from state
    const game = roomManager.getGame(currentRoomId);
        if (!game) return;
    
    // For simplicity, we'll manage game state through the room
    // In a production app, you'd want to persist the game object
    // Here we use a simplified approach
    
    const result = game.playCard(socket.id, cardId, chosenColor);
        if (result.success) {
          const newState = game.getState();
          room.gameState = newState;
      
          // Send individual states to each player
          for (const player of room.players) {
            const playerState = game.getPlayerState(player.id);
            io.to(player.id).emit('game:state_update', {
              ...playerState.publicState,
              yourHand: playerState.hand
            });
          }

          if (newState.winner) {
                      // Update scores for the winner
                      const scoreResult = game.calculateScore();
                      if (scoreResult.winner) {
                        roomManager.updateScores(currentRoomId, scoreResult.winner, scoreResult.scores);
                      }
                      // Emit scores to all players
                      const updatedRoom = roomManager.getRoom(currentRoomId);
                      if (updatedRoom) {
                        io.to(currentRoomId).emit('room:scores_update', updatedRoom.scores);
                      }
                      io.to(currentRoomId).emit('game:game_over', newState.winner, newState);
                }
    } else {
      socket.emit('game:error', result.message);
    }
  });

  // Draw a card
  socket.on('game:draw_card', () => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.gameState || room.phase !== 'game') return;

    const game = roomManager.getGame(currentRoomId);
        if (!game) return;

    const result = game.drawCardAction(socket.id);
        if (result.success) {
          const newState = game.getState();
          room.gameState = newState;
      
          for (const player of room.players) {
        const playerState = game.getPlayerState(player.id);
        io.to(player.id).emit('game:state_update', {
          ...playerState.publicState,
          yourHand: playerState.hand
        });
      }
    } else {
      socket.emit('game:error', result.message);
    }
  });

  // Choose color for wild card
  socket.on('game:choose_color', (color: CardColor) => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.gameState || room.phase !== 'game') return;

    const game = roomManager.getGame(currentRoomId);
        if (!game) return;

    const result = game.chooseColor(socket.id, color);
        if (result.success) {
          const newState = game.getState();
          room.gameState = newState;
      
          for (const player of room.players) {
        const playerState = game.getPlayerState(player.id);
        io.to(player.id).emit('game:state_update', {
          ...playerState.publicState,
          yourHand: playerState.hand
        });
      }
    } else {
      socket.emit('game:error', result.message);
    }
  });

  // Call UNO
    socket.on('game:call_uno', () => {
      if (!currentRoomId) return;
    
      const room = roomManager.getRoom(currentRoomId);
      if (!room || !room.gameState || room.phase !== 'game') return;

      const game = roomManager.getGame(currentRoomId);
          if (!game) return;

      const result = game.callUno(socket.id);
      if (result.success) {
        io.to(currentRoomId).emit('game:uno_called', socket.id);
      } else {
        socket.emit('game:error', result.message);
      }
    });

    // Catch a player who forgot to call UNO
    socket.on('game:catch_uno', () => {
      if (!currentRoomId) return;
    
      const room = roomManager.getRoom(currentRoomId);
      if (!room || !room.gameState || room.phase !== 'game') return;

      const game = roomManager.getGame(currentRoomId);
          if (!game) return;

      const result = game.catchUno(socket.id);
          if (result.success) {
            const newState = game.getState();
            room.gameState = newState;
      
            for (const player of room.players) {
              const playerState = game.getPlayerState(player.id);
              io.to(player.id).emit('game:state_update', {
                ...playerState.publicState,
                yourHand: playerState.hand
              });
            }
          } else {
            socket.emit('game:error', result.message);
      }
    });

  // Pass turn
  socket.on('game:pass_turn', () => {
    if (!currentRoomId) return;
    
    const room = roomManager.getRoom(currentRoomId);
    if (!room || !room.gameState || room.phase !== 'game') return;

    const game = roomManager.getGame(currentRoomId);
        if (!game) return;

    const result = game.passTurn(socket.id);
        if (result.success) {
          const newState = game.getState();
          room.gameState = newState;
      
          for (const player of room.players) {
        const playerState = game.getPlayerState(player.id);
        io.to(player.id).emit('game:state_update', {
          ...playerState.publicState,
          yourHand: playerState.hand
        });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoomId) {
      const room = roomManager.getRoom(currentRoomId);
      const player = room?.players.find((p: PlayerRoomInfo) => p.id === socket.id);
      const playerName = player?.name || 'Unknown';
      
      const result = roomManager.leaveRoom(currentRoomId, socket.id);
      
      if (result.success) {
        const updatedRoom = roomManager.getRoom(currentRoomId);
        if (updatedRoom) {
          socket.to(currentRoomId).emit('room:player_left', socket.id);
        }
        console.log(`${playerName} disconnected from room ${currentRoomId}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`UNO Server running on port ${PORT}`);
  console.log(`WebSocket server ready for connections`);
});

export default app;