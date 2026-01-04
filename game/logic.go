package game

import (
	"errors"
)

func ApplyMove(g *Game, playerID string, col int) error {
	if g.Status != "playing" {
		return errors.New("game is not active")
	}

	if g.CurrentTurn != playerID {
		return errors.New("not your turn")
	}

	if col < 0 || col > 6 {
		return errors.New("invalid column")
	}

	// 1. Find the lowest empty row in this column
	rowIndex := -1
	for r := 5; r >= 0; r-- {
		if g.Board[r][col] == 0 {
			rowIndex = r
			break
		}
	}

	if rowIndex == -1 {
		return errors.New("column is full")
	}

	// 2. Determine Player Color
	// FIX: Iterate through players to find the matching ID (since map keys are Usernames)
	playerColor := 0
	for _, p := range g.Players {
		if p.ID == playerID {
			playerColor = p.Color
			break
		}
	}

	// Fallback/Safety check
	if playerColor == 0 {
		if playerID == "cpu" {
			playerColor = 2
		} else {
			return errors.New("player not found")
		}
	}

	// 3. Update Board
	g.Board[rowIndex][col] = playerColor

	// 4. Check Win
	if CheckWin(g.Board, playerColor) {
		g.Status = "finished"
		g.Winner = playerID
		return nil
	}

	// 5. Check Draw (Board Full)
	isFull := true
	for c := 0; c < 7; c++ {
		if g.Board[0][c] == 0 {
			isFull = false
			break
		}
	}
	if isFull {
		g.Status = "finished"
		g.Winner = "draw"
		return nil
	}

	// 6. Switch Turn
	// We need to find the ID of the OTHER player
	nextTurn := ""
	for _, p := range g.Players {
		if p.ID != playerID {
			nextTurn = p.ID
			break
		}
	}
	
	g.CurrentTurn = nextTurn
	return nil
}

// CheckWin checks horizontal, vertical, and diagonal lines
func CheckWin(b [6][7]int, color int) bool {
	// Horizontal
	for r := 0; r < 6; r++ {
		for c := 0; c < 4; c++ {
			if b[r][c] == color && b[r][c+1] == color && b[r][c+2] == color && b[r][c+3] == color {
				return true
			}
		}
	}
	// Vertical
	for r := 0; r < 3; r++ {
		for c := 0; c < 7; c++ {
			if b[r][c] == color && b[r+1][c] == color && b[r+2][c] == color && b[r+3][c] == color {
				return true
			}
		}
	}
	// Diagonal /
	for r := 3; r < 6; r++ {
		for c := 0; c < 4; c++ {
			if b[r][c] == color && b[r-1][c+1] == color && b[r-2][c+2] == color && b[r-3][c+3] == color {
				return true
			}
		}
	}
	// Diagonal \
	for r := 0; r < 3; r++ {
		for c := 0; c < 4; c++ {
			if b[r][c] == color && b[r+1][c+1] == color && b[r+2][c+2] == color && b[r+3][c+3] == color {
				return true
			}
		}
	}
	return false
}