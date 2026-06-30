import TempleRunGame from "@/components/temple-run-game";
import { Trophy } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
            <span className="gradient-text">Temple Run</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
            <a className="transition hover:text-foreground" href="#">Play</a>
            <a className="transition hover:text-foreground" href="#">Leaderboard</a>
            <a className="transition hover:text-foreground" href="#">Settings</a>
          </nav>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4 text-yellow-400" />
            <span>High Score</span>
          </div>
        </div>
      </header>

      <main className="container flex flex-1 flex-col items-center py-8 md:py-12">
        <div className="animate-fade-up w-full max-w-4xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              <span className="gradient-text">Temple Run</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Dodge obstacles, collect coins, and run forever in this endless temple chase
            </p>
          </div>

          <TempleRunGame />
        </div>
      </main>

      <footer className="border-t border-border/50 py-4">
        <div className="container text-center text-xs text-muted-foreground">
          Built with Next.js · Swipe or use arrow keys · Survive as long as you can
        </div>
      </footer>
    </div>
  );
}
