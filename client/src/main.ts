// ============================================================
// UNO CLASSIC - Main Entry Point
// Retro pixel-art inspired UNO game
// ============================================================

import { socketClient } from './game/socketClient';
import { CardColor } from '../../shared/types';
import { GameUI } from './ui/gameUI';
import './styles/game.css';

// ===== STATE =====
let currentScreen: string = 'loading-screen';
let playerName: string = '';
let currentRoomId: string = '';
let myPlayerId: string = '';
let isAdmin: boolean = false;
let isReady: boolean = false;
let gameUI: GameUI | null = null;

// ===== SCREEN MANAGEMENT =====
function showScreen(screenId: string): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.add('active');
    currentScreen = screenId;
  }
  
  // Stop game loop when leaving game screen
  if (screenId !== 'game-screen' && gameUI) {
    gameUI.stop();
    gameUI = null;
  }
}

// ===== DOM REFERENCES =====
const $ = (id: string) => document.getElementById(id)!;

// Loading
const loadingScreen = $('loading-screen');

// Lobby
const lobbyScreen = $('lobby-screen');
const tabCreate = $('tab-create');
const tabJoin = $('tab-join');
const createName = $('create-name') as HTMLInputElement;
const joinName = $('join-name') as HTMLInputElement;
const joinCode = $('join-code') as HTMLInputElement;
const btnCreateRoom = $('btn-create-room');
const btnJoinRoom = $('btn-join-room');
const createResult = $('create-result');
const roomCodeDisplay = $('room-code-display');
const lobbyError = $('lobby-error');

// Room
const roomScreen = $('room-screen');
const roomCodeHeader = $('room-code-header');
const playersContainer = $('players-container');
const playerCount = $('player-count');
const btnReady = $('btn-ready');
const btnStartGame = $('btn-start-game');
const btnLeaveRoom = $('btn-leave-room');
const roomError = $('room-error');

// Scoreboard
const scoreboardSection = $('scoreboard-section');
const scoresContainer = $('scores-container');

// Game
const gameScreen = $('game-screen');

// ===== LOBBY SCREEN LOGIC =====

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    
    const tabName = btn.getAttribute('data-tab');
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) tabContent.classList.add('active');
  });
});

// Create Room
btnCreateRoom.addEventListener('click', () => {
  const name = createName.value.trim();
  if (!name) {
    showLobbyError('Please enter your name');
    return;
  }
  playerName = name;
  socketClient.createRoom(name);
});

// Join Room
btnJoinRoom.addEventListener('click', () => {
  const name = joinName.value.trim();
  const code = joinCode.value.trim().toUpperCase();
  
  if (!name) {
    showLobbyError('Please enter your name');
    return;
  }
  if (!code || code.length !== 4) {
    showLobbyError('Please enter a valid 4-letter room code');
    return;
  }
  
  playerName = name;
  socketClient.joinRoom(code, name);
});

function showLobbyError(msg: string): void {
  lobbyError.textContent = msg;
  lobbyError.classList.remove('hidden');
  setTimeout(() => lobbyError.classList.add('hidden'), 3000);
}

// ===== ROOM SCREEN LOGIC =====

// Ready button
btnReady.addEventListener('click', () => {
  isReady = !isReady;
  socketClient.setReady(isReady);
  btnReady.textContent = isReady ? 'READY' : 'NOT READY';
  btnReady.classList.toggle('secondary', !isReady);
  btnReady.classList.toggle('primary', isReady);
});

// Start Game button
btnStartGame.addEventListener('click', () => {
  socketClient.startGame();
});

// Leave Room
btnLeaveRoom.addEventListener('click', () => {
  socketClient.leaveRoom();
  showScreen('lobby-screen');
  currentRoomId = '';
  isAdmin = false;
  isReady = false;
  btnReady.textContent = 'READY';
  btnReady.classList.remove('primary');
  btnReady.classList.add('secondary');
  deactivateChat();
});

function updatePlayersList(players: any[]): void {
  playersContainer.innerHTML = '';
  playerCount.textContent = String(players.length);
  
  for (const player of players) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.id = `player-${player.id}`;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = player.name;
    if (player.isAdmin) {
      const badge = document.createElement('span');
      badge.className = 'admin-badge';
      badge.textContent = '[ADMIN]';
      nameSpan.appendChild(badge);
    }
    
    const statusSpan = document.createElement('span');
    statusSpan.className = `player-status ${player.isReady ? '' : 'not-ready'}`;
    statusSpan.textContent = player.isReady ? 'READY' : 'NOT READY';
    
    card.appendChild(nameSpan);
    card.appendChild(statusSpan);
    playersContainer.appendChild(card);
  }
  
  // Show/hide start button for admin
  if (isAdmin) {
    btnStartGame.classList.remove('hidden');
    const allReady = players.length >= 2 && players.every(p => p.isReady);
    btnStartGame.classList.toggle('primary', allReady);
    btnStartGame.classList.toggle('secondary', !allReady);
    btnStartGame.disabled = !allReady;
  } else {
    btnStartGame.classList.add('hidden');
  }
}

// ===== SOCKET EVENT HANDLERS =====

// Connection established
socketClient.on('client:connected', (id: string) => {
  myPlayerId = id;
  console.log('Connected with ID:', id);
  // Transition from loading to lobby after brief pause
  setTimeout(() => showScreen('lobby-screen'), 1000);
});

// Room events
socketClient.on('room:joined', (roomId: string, players: any[]) => {
  currentRoomId = roomId;
  roomCodeHeader.textContent = roomId;
  roomCodeDisplay.textContent = roomId;
  
  // Show room code in create result
  createResult.classList.remove('hidden');
  
  // Update players
  updatePlayersList(players);
  
  // Check if I'm admin
  const me = players.find(p => p.id === myPlayerId);
  isAdmin = me?.isAdmin || false;
  
  // Show room screen
    showScreen('room-screen');
  });

  // Handle scores update
socketClient.on('room:scores_update', (scores: Record<string, number>) => {
  updateScoresBoard(scores);
});

// Handle return to lobby after game
socketClient.on('room:returned_to_lobby', (players: any[], scores: Record<string, number>) => {
  // Sync ready status from server (don't hardcode to false)
  const me = players.find(p => p.id === myPlayerId);
  isReady = me?.isReady || false;
  currentRoomId = currentRoomId; // keep room id
  // Stop game UI
  if (gameUI) {
    gameUI.stop();
    gameUI = null;
  }
  // Update players list
  updatePlayersList(players);
  
  // Check if I'm admin
  isAdmin = me?.isAdmin || false;
  
  // Update scores
  updateScoresBoard(scores);
  
  // Sync ready button with server state
  btnReady.textContent = isReady ? 'READY' : 'NOT READY';
  btnReady.classList.toggle('primary', isReady);
  btnReady.classList.toggle('secondary', !isReady);
  
  // Show room screen
  showScreen('room-screen');
});

function updateScoresBoard(scores: Record<string, number>): void {
  const section = scoreboardSection;
  const container = scoresContainer;
  container.innerHTML = '';
  
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    section.classList.add('hidden');
    return;
  }
  
  section.classList.remove('hidden');
  
  // Sort by wins descending
  entries.sort((a, b) => b[1] - a[1]);
  
  for (const [playerId, wins] of entries) {
    const row = document.createElement('div');
    row.className = 'score-row';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'score-name';
    // Try to find the player name
    const playerCard = document.getElementById(`player-${playerId}`);
    const playerName = playerCard?.querySelector('.player-name')?.textContent || playerId.substring(0, 8);
    nameSpan.textContent = playerName;
    
    const winsSpan = document.createElement('span');
    winsSpan.className = 'score-wins';
    winsSpan.textContent = `${wins} win${wins !== 1 ? 's' : ''}`;
    
    row.appendChild(nameSpan);
    row.appendChild(winsSpan);
    container.appendChild(row);
  }
}

socketClient.on('room:player_joined', (player: any) => {
  // Add player to list
  const container = playersContainer;
  const card = document.createElement('div');
  card.className = 'player-card';
  card.id = `player-${player.id}`;
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'player-name';
  nameSpan.textContent = player.name;
  
  const statusSpan = document.createElement('span');
  statusSpan.className = 'player-status not-ready';
  statusSpan.textContent = 'NOT READY';
  
  card.appendChild(nameSpan);
  card.appendChild(statusSpan);
  container.appendChild(card);
  
  playerCount.textContent = String(container.children.length);
  
  // Update admin visibility
  if (isAdmin) {
    btnStartGame.classList.remove('hidden');
  }
});

socketClient.on('room:player_left', (playerId: string) => {
  const playerCard = document.getElementById(`player-${playerId}`);
  if (playerCard) playerCard.remove();
  playerCount.textContent = String(playersContainer.children.length);
});

socketClient.on('room:player_ready', (playerId: string, ready: boolean) => {
  const playerCard = document.getElementById(`player-${playerId}`);
  if (playerCard) {
    const status = playerCard.querySelector('.player-status');
    if (status) {
      status.textContent = ready ? 'READY' : 'NOT READY';
      status.className = `player-status ${ready ? '' : 'not-ready'}`;
    }
  }
  
  // Check if all ready for admin
  if (isAdmin) {
    const allPlayers = document.querySelectorAll('.player-card');
    let allReady = allPlayers.length >= 2;
    allPlayers.forEach(p => {
      const status = p.querySelector('.player-status');
      if (status?.textContent !== 'READY') allReady = false;
    });
    btnStartGame.classList.toggle('primary', allReady);
    btnStartGame.classList.toggle('secondary', !allReady);
    btnStartGame.disabled = !allReady;
  }
});

// Game events
socketClient.on('game:started', (gameState: any) => {
  showScreen('game-screen');
  activateChat();
  
  // Initialize game UI
  gameUI = new GameUI('game-canvas');
  gameUI.setPlayerId(myPlayerId);
  gameUI.updateGameState(gameState, gameState.yourHand || []);
  gameUI.start();
});

socketClient.on('game:state_update', (state: any) => {
  if (gameUI) {
    gameUI.updateGameState(state, state.yourHand || []);
  }
});

socketClient.on('game:game_over', (winnerId: string, finalState: any) => {
  if (gameUI) {
    gameUI.updateGameState(finalState, finalState.yourHand || []);
  }
  
  // Show game over modal (handled by gameUI)
});

// Error handling
socketClient.on('room:error', (message: string) => {
  showLobbyError(message);
});

socketClient.on('game:error', (message: string) => {
  console.warn('Game error:', message);
});

// ===== CHAT SYSTEM =====
const chatOverlay = document.getElementById('chat-overlay')!;
const chatMessages = document.getElementById('chat-messages')!;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const chatSendBtn = document.getElementById('chat-send-btn')!;
const chatToggleBtn = document.getElementById('chat-toggle-btn')!;
const chatHeader = document.getElementById('chat-header')!;
let chatCollapsed = false;

// Only show chat during active gameplay (not in room/lobby)
function activateChat() {
  chatOverlay.classList.add('active');
}

function deactivateChat() {
  chatOverlay.classList.remove('active');
}

// Handle incoming chat messages
socketClient.on('chat:message', (data: { playerId: string; playerName: string; message: string; timestamp: number }) => {
  addChatMessage(data.playerId, data.playerName, data.message, data.timestamp);
});

function addChatMessage(playerId: string, playerName: string, message: string, timestamp?: number): void {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg';
  
  const isMe = playerId === myPlayerId;
  const nameSpan = document.createElement('span');
  nameSpan.className = `msg-name${isMe ? ' me' : ''}`;
  nameSpan.textContent = playerName + ': ';
  
  const textSpan = document.createElement('span');
  textSpan.className = 'msg-text';
  textSpan.textContent = message;
  
  msgDiv.appendChild(nameSpan);
  msgDiv.appendChild(textSpan);
  
  if (timestamp) {
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    const date = new Date(timestamp);
    timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgDiv.appendChild(timeSpan);
  }
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Send chat message
function sendChatMessage(): void {
  const msg = chatInput.value.trim();
  if (!msg) return;
  socketClient.sendChatMessage(msg);
  chatInput.value = '';
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChatMessage();
  }
});

// Toggle collapse
chatToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  chatCollapsed = !chatCollapsed;
  if (chatCollapsed) {
    chatMessages.classList.add('collapsed');
    document.getElementById('chat-input-area')!.classList.add('collapsed');
    chatToggleBtn.textContent = '+';
    chatMessages.style.display = 'none';
    document.getElementById('chat-input-area')!.style.display = 'none';
  } else {
    chatMessages.classList.remove('collapsed');
    document.getElementById('chat-input-area')!.classList.remove('collapsed');
    chatMessages.style.display = '';
    document.getElementById('chat-input-area')!.style.display = '';
    chatToggleBtn.textContent = '−';
  }
});

// Also toggle on header click
chatHeader.addEventListener('click', () => {
  chatToggleBtn.click();
});

// ===== INITIALIZATION =====
function init(): void {
  console.log('UNO Classic starting...');
  
  // Connect to server
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  socketClient.connect(serverUrl);
  
  // Show loading
  showScreen('loading-screen');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}