import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

type GameState = {
  board: number[][];
  currentTurn: string;
  status: "waiting" | "playing" | "finished";
  winner?: string;
  players: Record<string, { username: string; color: number; id: string }>;
};

export default function Game() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const username = searchParams.get("username");

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState("Connecting...");
  const { toast } = useToast();

  useEffect(() => {
    if (!username) {
      setLocation("/");
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?username=${encodeURIComponent(username)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setStatusMsg("Looking for opponent...");
    
    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      switch (msg.type) {
        case "waiting":
          setStatusMsg(msg.payload);
          break;
        case "start":
          setMyPlayerId(msg.payload.playerId);
          setStatusMsg("Game Started!");
          toast({
            title: "Match Found!",
            description: `Playing against ${msg.payload.opponent}`,
          });
          break;
        case "update":
          setGameState(msg.payload);
          break;
        case "error":
          toast({ variant: "destructive", title: "Error", description: msg.payload });
          break;
      }
    };

    socket.onclose = () => setStatusMsg("Disconnected. Reconnecting...");
    setWs(socket);

    return () => socket.close();
  }, [username, setLocation, toast]);

  const dropDisc = (colIndex: number) => {
    if (!ws || !gameState || gameState.status !== "playing") return;
    if (gameState.currentTurn !== myPlayerId) return;

    ws.send(JSON.stringify({
      type: "move",
      payload: { column: colIndex }
    }));
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
        <p className="text-xl font-medium text-slate-400">{statusMsg}</p>
        <Button variant="ghost" onClick={() => setLocation("/")}>Cancel</Button>
      </div>
    );
  }

  const isMyTurn = gameState.currentTurn === myPlayerId;
  const winnerName = gameState.winner 
    ? (gameState.winner === myPlayerId ? "You Won!" : (gameState.winner === "draw" ? "Draw!" : "Opponent Won"))
    : null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <Button variant="ghost" className="text-slate-400" onClick={() => setLocation("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Exit
        </Button>
        <div className="flex gap-4">
            <Badge variant="outline" className="border-red-500 text-red-500 px-4 py-1">
                Player 1 (Red)
            </Badge>
            <Badge variant="outline" className="border-yellow-500 text-yellow-500 px-4 py-1">
                Player 2 (Yellow)
            </Badge>
        </div>
      </div>

      {/* Game Status */}
      <Card className="bg-slate-900/50 border-slate-800 p-6 mb-8 text-center min-w-[300px]">
        {gameState.status === "finished" ? (
          <div className="space-y-4">
            <h2 className={`text-4xl font-black uppercase ${
              winnerName === "You Won!" ? "text-green-500" : "text-slate-200"
            }`}>
              {winnerName}
            </h2>
            <Button onClick={() => window.location.reload()}>Play Again</Button>
          </div>
        ) : (
          <h2 className={`text-2xl font-bold ${isMyTurn ? "text-indigo-400 animate-pulse" : "text-slate-500"}`}>
            {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
          </h2>
        )}
      </Card>

      {/* The Board */}
      <div className="bg-blue-900 p-4 rounded-xl shadow-2xl border-4 border-blue-800 inline-block">
        <div className="grid grid-cols-7 gap-3">
          {gameState.board[0].map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="flex flex-col gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors"
              onClick={() => dropDisc(colIndex)}
            >
              {gameState.board.map((row, rowIndex) => {
                const cell = row[colIndex]; // Access row, then col
                return (
                  <div 
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full shadow-inner
                      flex items-center justify-center transition-all duration-300
                      ${cell === 0 ? "bg-slate-900" : ""}
                      ${cell === 1 ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" : ""}
                      ${cell === 2 ? "bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]" : ""}
                    `}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}