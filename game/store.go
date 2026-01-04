package game

import "sync"

type GameStore struct {
	mu    sync.RWMutex
	games map[string]*Game
}

var Store = &GameStore{
	games: make(map[string]*Game),
}

func (s *GameStore) AddGame(g *Game) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.games[g.ID] = g
}

func (s *GameStore) GetGame(id string) *Game {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.games[id]
}

// FindGameByPlayerName finds an active game for reconnection
func (s *GameStore) FindGameByPlayerName(username string) *Game {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    for _, g := range s.games {
        // Only look for games that are still playing
        if g.Status == "playing" {
            if _, ok := g.Players[username]; ok {
                return g
            }
        }
    }
    return nil
}