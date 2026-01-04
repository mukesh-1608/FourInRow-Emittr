import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trophy, Gamepad2 } from "lucide-react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [, setLocation] = useLocation();

  const handleStart = () => {
    if (!username.trim()) return;
    setLocation(`/game?username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-50 shadow-2xl shadow-indigo-500/20">
        <CardHeader className="text-center">
          <div className="mx-auto bg-indigo-500/10 p-4 rounded-full w-fit mb-4">
            <Gamepad2 className="w-12 h-12 text-indigo-400" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            4 IN A ROW
          </CardTitle>
          <p className="text-slate-400">Enter the arena</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Input
              placeholder="Enter your username..."
              className="bg-slate-950 border-slate-800 h-12 text-lg focus-visible:ring-indigo-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
            />
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 transition-all"
              onClick={handleStart}
              disabled={!username}
            >
              Play Now
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-300"
              onClick={() => setLocation("/leaderboard")}
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}