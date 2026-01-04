import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy } from "lucide-react";

type LeaderboardEntry = {
  username: string;
  total_wins: number;
};

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/leaderboard"],
  });

  return (
    <div className="min-h-screen w-full bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="outline" 
          className="border-slate-800 text-slate-400 hover:text-white"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl text-slate-50 flex items-center gap-2">
              <Trophy className="text-yellow-500" /> 
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                  <TableHead className="text-slate-400">Rank</TableHead>
                  <TableHead className="text-slate-400">Player</TableHead>
                  <TableHead className="text-right text-slate-400">Wins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-500 py-8">
                      Loading stats...
                    </TableCell>
                  </TableRow>
                ) : data?.map((entry, i) => (
                  <TableRow key={entry.username} className="border-slate-800 text-slate-200 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-500">#{i + 1}</TableCell>
                    <TableCell className="font-bold">{entry.username}</TableCell>
                    <TableCell className="text-right text-indigo-400">{entry.total_wins}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}