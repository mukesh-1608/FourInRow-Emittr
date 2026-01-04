package server

import (
	"log"
	"sync"
	"time"

	"fourinrow/analytics"
	"fourinrow/game"
	"fourinrow/game/bot"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Matchmaker struct {
	mu            sync.Mutex
	pendingPlayer *game.Player
	timer         *time.Timer
}

var GlobalMatchmaker = &Matchmaker{}

const MatchmakingTimeout = 10 * time.Second

func (m *Matchmaker) Join(username string, conn *websocket.Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()

	log.Printf("[MATCHMAKER] Player joined: %s", username)

	// 1. Reconnection Logic
	if activeGame := game.Store.FindGameByPlayerName(username); activeGame != nil {
		log.Printf("[MATCHMAKER] Reconnecting player %s to game %s", username, activeGame.ID)
		player := activeGame.Players[username]
		if player.DisconnectTimer != nil {
			player.DisconnectTimer.Stop()
			player.DisconnectTimer = nil
		}
		player.Conn = conn
		player.IsConnected = true
		
		conn.WriteJSON(game.WSMessage{Type: "start", Payload: map[string]interface{}{
			"gameId": activeGame.ID, "color": player.Color, "playerId": player.ID, "opponent": "Opponent", 
		}})
		conn.WriteJSON(game.WSMessage{Type: "update", Payload: activeGame})
		return
	}

	player := &game.Player{
		ID:          uuid.New().String(),
		Username:    username,
		Conn:        conn,
		IsConnected: true,
	}

	// 2. Prevent Self-Matching (React Strict Mode Fix)
	if m.pendingPlayer != nil && m.pendingPlayer.Username == username {
		log.Printf("[MATCHMAKER] Player %s rejoined (replacing pending connection)", username)
		if m.timer != nil { m.timer.Stop() }
		m.pendingPlayer = player
		
		conn.WriteJSON(game.WSMessage{Type: "waiting", Payload: "Looking for opponent... (10s)"})
		m.timer = time.AfterFunc(MatchmakingTimeout, func() {
			m.mu.Lock()
			defer m.mu.Unlock()
			if m.pendingPlayer == player {
				log.Printf("[MATCHMAKER] Timeout reached for %s. Starting Bot Game.", player.Username)
				m.pendingPlayer = nil 
				m.StartBotGame(player)
			}
		})
		return
	}

	// 3. PvP Match found
	if m.pendingPlayer != nil {
		log.Printf("[MATCHMAKER] PvP Match found: %s vs %s", m.pendingPlayer.Username, player.Username)
		if m.timer != nil { m.timer.Stop() }
		opponent := m.pendingPlayer
		m.pendingPlayer = nil 
		m.StartGame(opponent, player)
		return
	}

	// 4. Wait for opponent
	log.Printf("[MATCHMAKER] Player %s waiting for opponent...", username)
	m.pendingPlayer = player
	conn.WriteJSON(game.WSMessage{Type: "waiting", Payload: "Looking for opponent... (10s)"})

	m.timer = time.AfterFunc(MatchmakingTimeout, func() {
		m.mu.Lock()
		defer m.mu.Unlock()
		if m.pendingPlayer == player {
			log.Printf("[MATCHMAKER] Timeout reached for %s. Starting Bot Game.", player.Username)
			m.pendingPlayer = nil 
			m.StartBotGame(player)
		}
	})
}

func (m *Matchmaker) StartGame(p1, p2 *game.Player) {
	gameID := uuid.New().String()
	newGame := &game.Game{
		ID: gameID, Players: make(map[string]*game.Player),
		Status: "playing", CurrentTurn: p1.ID, CreatedAt: time.Now(),
	}
	p1.Color = 1; p1.GameID = gameID
	p2.Color = 2; p2.GameID = gameID
	newGame.Players[p1.Username] = p1
	newGame.Players[p2.Username] = p2
	game.Store.AddGame(newGame)

	// Send Start Signal
	p1.Conn.WriteJSON(game.WSMessage{Type: "start", Payload: map[string]interface{}{"gameId": gameID, "color": 1, "playerId": p1.ID, "opponent": p2.Username}})
	p2.Conn.WriteJSON(game.WSMessage{Type: "start", Payload: map[string]interface{}{"gameId": gameID, "color": 2, "playerId": p2.ID, "opponent": p1.Username}})
	
	// --- FIX: Send Initial Board State ---
	p1.Conn.WriteJSON(game.WSMessage{Type: "update", Payload: newGame})
	p2.Conn.WriteJSON(game.WSMessage{Type: "update", Payload: newGame})
	// -------------------------------------

	analytics.Producer.Emit(analytics.GameEvent{Type: "game_started", GameID: gameID, Payload: "PvP"})
}

func (m *Matchmaker) StartBotGame(p1 *game.Player) {
	gameID := uuid.New().String()
	botPlayer := &game.Player{ID: "cpu", Username: "Bot 🤖", Color: 2, IsBot: true, IsConnected: true, GameID: gameID}

	newGame := &game.Game{
		ID: gameID, Players: make(map[string]*game.Player),
		Status: "playing", CurrentTurn: p1.ID, CreatedAt: time.Now(),
	}
	p1.Color = 1; p1.GameID = gameID
	newGame.Players[p1.Username] = p1
	newGame.Players["cpu"] = botPlayer 

	game.Store.AddGame(newGame)
	
	log.Printf("[MATCHMAKER] Sending start message to %s for Game %s", p1.Username, gameID)
	
	// Send Start Signal
	err := p1.Conn.WriteJSON(game.WSMessage{Type: "start", Payload: map[string]interface{}{"gameId": gameID, "color": 1, "playerId": p1.ID, "opponent": "Bot 🤖"}})
	if err != nil {
		log.Printf("[ERROR] Failed to send start message: %v", err)
	}

	// --- FIX: Send Initial Board State ---
	p1.Conn.WriteJSON(game.WSMessage{Type: "update", Payload: newGame})
	// -------------------------------------

    analytics.Producer.Emit(analytics.GameEvent{Type: "game_started", GameID: gameID, Payload: "PvE"})
}

// HandleMove processes the move synchronously
func HandleMove(g *game.Game, playerUsername string, col int) {
    player, ok := g.Players[playerUsername]
	if !ok { return }
    
    // 1. Human Move
    if err := game.ApplyMove(g, player.ID, col); err != nil {
        player.Conn.WriteJSON(game.WSMessage{Type: "error", Payload: err.Error()})
        return
    }
    BroadcastState(g)
    if g.Status == "finished" { HandleGameOver(g); return }

    // 2. Bot Move (Synchronous)
    if g.CurrentTurn == "cpu" {
        time.Sleep(500 * time.Millisecond) // Think time

        botCol, err := bot.GetBestMove(g, 2)
        if err != nil {
            botCol = 0 // Fallback
        }
        
        game.ApplyMove(g, "cpu", botCol)
        BroadcastState(g)
        if g.Status == "finished" {
            HandleGameOver(g)
        }
    }
}