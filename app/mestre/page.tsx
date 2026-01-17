"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Users, Clock } from "lucide-react";

export default function MestrePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey);

    if (savedRole !== "mestre") {
      router.push("/");
      return;
    }

    setLoading(false);
  }, [user, isLoaded, router]);

  const [gameState, setGameState] = useState({
    blueTeam: Array(11)
      .fill(null)
      .map((_, i) => ({
        id: `blue-${i}`,
        x: 15 + (i % 4) * 10,
        y: 20 + Math.floor(i / 4) * 20,
        number: i + 1,
      })),
    redTeam: Array(11)
      .fill(null)
      .map((_, i) => ({
        id: `red-${i}`,
        x: 65 + (i % 4) * 10,
        y: 20 + Math.floor(i / 4) * 20,
        number: i + 1,
      })),
    ball: { x: 50, y: 50 },
    time: 0,
    isPlaying: false,
    score: { blue: 0, red: 0 },
  });

  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.isPlaying) {
      interval = setInterval(() => {
        setGameState((prev) => ({ ...prev, time: prev.time + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  // Salvar estado do jogo automaticamente no localStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("current-game", JSON.stringify(gameState));
    }
  }, [gameState, loading]);

  const handleMouseDown = (id: string) => {
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (dragging === "ball") {
      setGameState((prev) => ({ ...prev, ball: { x, y } }));
      return;
    }

    const [team, idx] = dragging.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) =>
        player.id === dragging ? { ...player, x, y } : player,
      ),
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetGame = () => {
    setGameState({
      blueTeam: Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `blue-${i}`,
          x: 15 + (i % 4) * 10,
          y: 20 + Math.floor(i / 4) * 20,
          number: i + 1,
        })),
      redTeam: Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `red-${i}`,
          x: 65 + (i % 4) * 10,
          y: 20 + Math.floor(i / 4) * 20,
          number: i + 1,
        })),
      ball: { x: 50, y: 50 },
      time: 0,
      isPlaying: false,
      score: { blue: 0, red: 0 },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-4xl">⚽</div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Painel do Mestre
              </h1>
              <p className="text-gray-400">Controle total da partida</p>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Controles */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Placar */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" /> Placar
              </h3>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="text-blue-400 font-bold mb-1">TIME AZUL</div>
                  <input
                    type="number"
                    value={gameState.score.blue}
                    onChange={(e) =>
                      setGameState((prev) => ({
                        ...prev,
                        score: {
                          ...prev.score,
                          blue: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-16 bg-gray-600 text-white text-2xl font-bold text-center rounded p-2"
                  />
                </div>
                <div className="text-white text-2xl font-bold">X</div>
                <div className="text-center">
                  <div className="text-red-400 font-bold mb-1">
                    TIME VERMELHO
                  </div>
                  <input
                    type="number"
                    value={gameState.score.red}
                    onChange={(e) =>
                      setGameState((prev) => ({
                        ...prev,
                        score: {
                          ...prev.score,
                          red: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                    className="w-16 bg-gray-600 text-white text-2xl font-bold text-center rounded p-2"
                  />
                </div>
              </div>
            </div>

            {/* Tempo */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Cronômetro
              </h3>
              <div className="text-4xl font-bold text-white text-center mb-3">
                {formatTime(gameState.time)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setGameState((prev) => ({
                      ...prev,
                      isPlaying: !prev.isPlaying,
                    }))
                  }
                  className={`flex-1 ${gameState.isPlaying ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700"} text-white px-4 py-2 rounded flex items-center justify-center gap-2`}
                >
                  {gameState.isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {gameState.isPlaying ? "Pausar" : "Iniciar"}
                </button>
              </div>
            </div>

            {/* Ações */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Ações</h3>
              <button
                onClick={resetGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 mb-2"
              >
                <RotateCcw className="w-4 h-4" />
                Resetar Jogo
              </button>
              <div className="text-green-400 text-sm text-center mt-2">
                ✓ Salvando automaticamente
              </div>
            </div>
          </div>
        </div>

        {/* Campo */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-bold mb-4">Campo de Jogo</h3>
          <div
            className="relative w-full bg-green-700 rounded-lg overflow-hidden cursor-move"
            style={{ paddingBottom: "66.67%" }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="absolute inset-0">
              {/* Linhas do campo */}
              <div className="absolute inset-0 border-4 border-white opacity-50"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white opacity-50"></div>
              <div className="absolute left-1/2 top-1/2 w-20 h-20 border-4 border-white rounded-full opacity-50 -translate-x-1/2 -translate-y-1/2"></div>

              {/* Jogadores Time Azul */}
              {gameState.blueTeam.map((player) => (
                <div
                  key={player.id}
                  onMouseDown={() => handleMouseDown(player.id)}
                  style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  className="absolute w-8 h-8 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg"
                >
                  {player.number}
                </div>
              ))}

              {/* Jogadores Time Vermelho */}
              {gameState.redTeam.map((player) => (
                <div
                  key={player.id}
                  onMouseDown={() => handleMouseDown(player.id)}
                  style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  className="absolute w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg"
                >
                  {player.number}
                </div>
              ))}

              {/* Bola */}
              <div
                onMouseDown={() => handleMouseDown("ball")}
                style={{
                  left: `${gameState.ball.x}%`,
                  top: `${gameState.ball.y}%`,
                }}
                className="absolute w-6 h-6 bg-white rounded-full cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform shadow-xl border-2 border-gray-800"
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs">
                  ⚽
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            💡 Arraste os jogadores e a bola para posicioná-los no campo
          </p>
        </div>
      </div>
    </div>
  );
}
