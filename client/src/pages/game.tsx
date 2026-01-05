import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Share2, LogOut, Trophy, AlertCircle } from "lucide-react";

// Updated GameState to include isConnected info
type GameState = {
  board: number[][];
  currentTurn: string;
  status: "waiting" | "playing" | "finished";
  winner?: string;
  players: Record<string, { username: string; color: number; id: string; isConnected?: boolean }>;
};

export default function Game() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const username = searchParams.get("username");

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState("Connecting...");
  const [opponentName, setOpponentName] = useState("Waiting...");

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
          setOpponentName(msg.payload.opponent);
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

  const copyInviteLink = () => {
    const link = `${window.location.origin}/`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Send this to your friend so they can join!",
    });
  };

  // Loading Screen
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-4 max-w-md w-full text-center animate-in fade-in zoom-in duration-500 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <h2 className="text-2xl font-bold text-white tracking-wider">{statusMsg}</h2>
          <p className="text-slate-400">Invite a friend while you wait!</p>
          <Button onClick={copyInviteLink} className="bg-white/10 hover:bg-white/20 w-full gap-2 text-indigo-200 border border-white/5">
            <Share2 className="w-4 h-4" /> Share Game Link
          </Button>
          <Button variant="ghost" onClick={() => setLocation("/")} className="text-slate-500 hover:text-white">Cancel</Button>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.currentTurn === myPlayerId;
  
  // Determine Winner Text
  let winnerText = "";
  if (gameState.winner) {
      if (gameState.winner === myPlayerId) winnerText = "You Won! 🎉";
      else if (gameState.winner === "draw") winnerText = "It's a Draw! 🤝";
      else winnerText = "Opponent Won 💀";
  }

  // Get My Color
  const myPlayerInfo = Object.values(gameState.players).find(p => p.id === myPlayerId);
  const myColor = myPlayerInfo?.color || 1;

  // Check Opponent Connection
  const opponentInfo = Object.values(gameState.players).find(p => p.id !== myPlayerId);
  const isOpponentDisconnected = opponentInfo?.isConnected === false;

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center p-4 md:p-8 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
        </div>

      <div className="z-10 w-full max-w-4xl flex flex-col gap-6">
        {/* Header Panel */}
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md border border-white/10 shadow-xl p-4 rounded-xl">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${myColor === 1 ? "bg-red-500 shadow-[0_0_10px_red]" : "bg-yellow-400 shadow-[0_0_10px_yellow]"}`} />
            <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">You</p>
                <p className="font-bold text-white text-lg">{username}</p>
            </div>
          </div>

          <div className="text-center hidden md:block">
            {gameState.status === "playing" ? (
                <div className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${isMyTurn ? "bg-indigo-600 text-white shadow-lg scale-105" : "bg-slate-800 text-slate-400"}`}>
                    {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
                </div>
            ) : (
                <div className="px-6 py-2 bg-green-600/20 text-green-400 border border-green-500/50 rounded-full font-bold animate-pulse">
                    GAME OVER
                </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Opponent</p>
                <div className="flex items-center justify-end gap-2">
                    {/* DISCONNECTED BADGE */}
                    {isOpponentDisconnected && (
                        <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded animate-pulse">
                            DISCONNECTED
                        </span>
                    )}
                    <p className="font-bold text-white text-lg">{opponentName}</p>
                </div>
            </div>
            <div className={`w-4 h-4 rounded-full ${myColor === 1 ? "bg-yellow-400 shadow-[0_0_10px_yellow]" : "bg-red-500 shadow-[0_0_10px_red]"}`} />
          </div>
        </div>

        {/* Game Board Container */}
        <div className="relative flex justify-center">
            <div className="bg-white/5 backdrop-blur-md border-2 border-white/5 shadow-2xl p-4 rounded-2xl relative">
                
                {/* Winner Overlay */}
                {gameState.status === "finished" && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl animate-in fade-in duration-500">
                        <div className="text-center p-8 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl transform scale-110">
                            {gameState.winner === myPlayerId ? <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" /> : <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />}
                            <h2 className="text-4xl font-black text-white mb-2">{winnerText}</h2>
                            <Button onClick={() => window.location.reload()} className="mt-4 bg-white text-black hover:bg-slate-200">
                                Play Again
                            </Button>
                        </div>
                    </div>
                )}

                {/* The Grid */}
                <div className="grid grid-cols-7 gap-2 md:gap-3 bg-indigo-900/30 p-3 md:p-4 rounded-xl backdrop-blur-sm border border-white/5">
                    {/* Iterate Columns (for correct clicking) */}
                    {gameState.board[0].map((_, colIndex) => (
                        <div
                            key={colIndex}
                            className={`flex flex-col gap-2 md:gap-3 cursor-pointer p-1 rounded-lg transition-all duration-200 hover:bg-white/5`}
                            onClick={() => dropDisc(colIndex)}
                        >
                             {/* Iterate Rows (Visual) */}
                             {/* Note: The backend board is [Row][Col]. We map rows directly. */}
                             {gameState.board.map((row, rowIndex) => {
                                // Logic: Inverted row rendering if needed, but standard map renders top-down (0 to 5).
                                // Usually Row 0 is bottom in Connect 4 logic, but if your backend sends it standard, we render standard.
                                // We stick to your original rendering logic:
                                const cell = row[colIndex];
                                
                                return (
                                    <div key={`${rowIndex}-${colIndex}`} className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-slate-900/80 shadow-inner flex items-center justify-center relative overflow-hidden">
                                        {cell !== 0 && (
                                            <div
                                                className={`w-full h-full rounded-full animate-in slide-in-from-top-48 duration-500 shadow-[inset_-2px_-2px_6px_rgba(0,0,0,0.3)] ${
                                                    cell === 1 
                                                    ? "bg-gradient-to-br from-red-400 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                                                    : "bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                                                }`}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={copyInviteLink} className="bg-white/10 hover:bg-white/20 text-indigo-300 border-indigo-500/30 backdrop-blur-sm">
                <Copy className="w-4 h-4 mr-2" /> Invite Friend
            </Button>
            <Button variant="destructive" onClick={() => setLocation("/")} className="bg-red-500/10 hover:bg-red-900/40 text-red-300 border-red-500/30 backdrop-blur-sm">
                <LogOut className="w-4 h-4 mr-2" /> Leave Game
            </Button>
        </div>
      </div>
    </div>
  );
}