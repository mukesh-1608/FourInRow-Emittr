package db

import (
	"database/sql"
	"log"
	"os"
	"time"

	"fourinrow/game"

	_ "github.com/lib/pq"
)

type Repository struct {
	db *sql.DB
}

type LeaderboardEntry struct {
	Username  string `json:"username"`
	TotalWins int    `json:"total_wins"`
}

var Repo *Repository

func InitDB() {
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Println("DATABASE_URL not set, DB disabled")
		return
	}

	// Connect to the DB
	db, err := sql.Open("postgres", url)
	if err != nil {
		log.Printf("[DB ERROR] Configuration error: %v", err)
		return
	}

	// Test the connection
	if err := db.Ping(); err != nil {
		log.Printf("[DB ERROR] Connection failed: %v", err)
		return
	}

	log.Println("✅ Successfully connected to PostgreSQL!")

	// Create the table if it doesn't exist
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS games (
		game_id TEXT PRIMARY KEY,
		player1 TEXT,
		player2 TEXT,
		winner TEXT,
		created_at TIMESTAMP,
		finished_at TIMESTAMP
	)`)
	
	if err != nil {
		log.Printf("[DB ERROR] Failed to create table: %v", err)
		return
	}

	Repo = &Repository{db: db}
}

func (r *Repository) SaveGame(g *game.Game) {
	if r == nil { return }

	var p1, p2 string
	i := 0
	for _, p := range g.Players {
		if i == 0 { p1 = p.Username } else { p2 = p.Username }
		i++
	}

	// --- FIX START: Correctly find the Winner's Username ---
	winner := g.Winner // Default to UUID if not found
	
	// Iterate through all players to find the one matching the Winner ID
	for _, p := range g.Players {
		if p.ID == g.Winner {
			winner = p.Username
			break
		}
	}
	// --- FIX END ---

	// Don't save if there is no winner
	if winner == "" { return }

	now := time.Now()
	_, err := r.db.Exec(`
	INSERT INTO games (game_id, player1, player2, winner, created_at, finished_at)
	VALUES ($1, $2, $3, $4, $5, $6)
	ON CONFLICT (game_id) DO UPDATE SET winner=$4, finished_at=$6
	`, g.ID, p1, p2, winner, now, now)

	if err != nil {
		log.Printf("[DB ERROR] Failed to save game: %v", err)
	}
}

func (r *Repository) GetLeaderboard() ([]LeaderboardEntry, error) {
	if r == nil { return nil, nil }

	rows, err := r.db.Query(`
	SELECT winner, COUNT(*) as wins FROM games
	WHERE winner != 'draw' AND winner != 'opponent'
	GROUP BY winner
	ORDER BY wins DESC
	LIMIT 10
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var res []LeaderboardEntry
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.Username, &e.TotalWins); err != nil {
			continue
		}
		res = append(res, e)
	}
	return res, nil
}