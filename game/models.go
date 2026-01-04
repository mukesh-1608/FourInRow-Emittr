package game

import (
	"github.com/gorilla/websocket"
	"time"
)

type Player struct {
	ID              string          `json:"id"`
	Username        string          `json:"username"`
	Color           int             `json:"color"` 
	Conn            *websocket.Conn `json:"-"`     
	IsBot           bool            `json:"isBot"`
	IsConnected     bool            `json:"isConnected"`
	DisconnectTimer *time.Timer     `json:"-"` // Needed for 30s timeout
	GameID          string          `json:"gameId"`
}

type Game struct {
	ID          string             `json:"id"`
	Board       [6][7]int          `json:"board"`
	Players     map[string]*Player `json:"players"`
	CurrentTurn string             `json:"currentTurn"` 
	Status      string             `json:"status"`      
	Winner      string             `json:"winner,omitempty"`
	CreatedAt   time.Time          `json:"-"`
}

type WSMessage struct {
	Type    string      `json:"type"` 
	Payload interface{} `json:"payload"`
}