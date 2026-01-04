package server

import (
	"encoding/json"
	"net/http"
	"time"

	"fourinrow/db"
	"fourinrow/game"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024, WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool { return true },
}

func WebSocketHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }

	username := r.URL.Query().Get("username")
	if username == "" { conn.Close(); return }

	// JOIN THE MATCHMAKER
	GlobalMatchmaker.Join(username, conn)

	// Read Loop
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			handleDisconnect(username)
			break
		}

		var msg game.WSMessage
		if err := json.Unmarshal(message, &msg); err != nil { continue }

		if msg.Type == "move" {
            g := game.Store.FindGameByPlayerName(username)
            if g != nil {
                payload := msg.Payload.(map[string]interface{})
                col := int(payload["column"].(float64))
                // Call the MATCHMAKER'S HandleMove
                HandleMove(g, username, col)
            }
		}
	}
}

func handleDisconnect(username string) {
	g := game.Store.FindGameByPlayerName(username)
	if g == nil || g.Status == "finished" { return }

	player := g.Players[username]
	player.IsConnected = false
	player.DisconnectTimer = time.AfterFunc(30*time.Second, func() {
		if !player.IsConnected {
			g.Status = "finished"
			g.Winner = "opponent" 
			BroadcastState(g)
            HandleGameOver(g)
		}
	})
}

func BroadcastState(g *game.Game) {
	for _, p := range g.Players {
		if p.IsConnected && !p.IsBot {
			p.Conn.WriteJSON(game.WSMessage{Type: "update", Payload: g})
		}
	}
}

func HandleGameOver(g *game.Game) {
    if db.Repo != nil { db.Repo.SaveGame(g) }
}