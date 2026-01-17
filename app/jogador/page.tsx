"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, Clock, Eye } from "lucide-react";

export default function JogadorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<any>(null);

  useEffect(() => {
    async function checkRole() {
      if (!isLoaded || !user) return;

      try {
        const roleKey = `user-role:${user.id}`;
        const result = await window.storage.get(roleKey);

        if (!result || result.value !== "jogador") {
          router.push("/");
          return;
        }
      } catch (error) {
        router.push("/");
        return;
      }

      setLoading(false);
    }

    checkRole();
  }, [user, isLoaded, router]);

  // Carregar estado do jogo a cada 2 segundos
  useEffect(() => {
    const loadGame = async () => {
      try {
        const result = await window.storage.get("current-game", true);
        if (result && result.value) {
          setGameState(JSON.parse(result.value));
        }
      } catch (error) {
        console.log("Aguardando jogo começar...");
      }
    };

    loadGame();
    const interval = setInterval(loadGame, 2000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚽</div>
          <div className="text-white text-2xl">
            Aguardando o mestre iniciar a partida...
          </div>
        </div>
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
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Eye className="w-8 h-8" />
                Visualização - Jogador
              </h1>
              <p className="text-gray-400">Acompanhando a partida</p>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Informações do Jogo */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Placar */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Placar
              </h3>
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <div className="text-blue-400 font-bold mb-2">TIME AZUL</div>
                  <div className="text-5xl font-bold text-white">
                    {gameState.score.blue}
                  </div>
                </div>
                <div className="text-white text-3xl font-bold">X</div>
                <div className="text-center">
                  <div className="text-red-400 font-bold mb-2">
                    TIME VERMELHO
                  </div>
                  <div className="text-5xl font-bold text-white">
                    {gameState.score.red}
                  </div>
                </div>
              </div>
            </div>

            {/* Tempo */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Tempo de Jogo
              </h3>
              <div className="text-6xl font-bold text-white text-center">
                {formatTime(gameState.time)}
              </div>
              <div className="text-center mt-3">
                {gameState.isPlaying ? (
                  <span className="text-green-400 flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                    Em andamento
                  </span>
                ) : (
                  <span className="text-yellow-400 flex items-center justify-center gap-2">
                    <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                    Pausado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Campo */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-bold mb-4">Campo de Jogo</h3>
          <div
            className="relative w-full bg-green-700 rounded-lg overflow-hidden"
            style={{ paddingBottom: "66.67%" }}
          >
            <div className="absolute inset-0">
              {/* Linhas do campo */}
              <div className="absolute inset-0 border-4 border-white opacity-50"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white opacity-50"></div>
              <div className="absolute left-1/2 top-1/2 w-20 h-20 border-4 border-white rounded-full opacity-50 -translate-x-1/2 -translate-y-1/2"></div>

              {/* Jogadores Time Azul */}
              {gameState.blueTeam.map((player: any) => (
                <div
                  key={player.id}
                  style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  className="absolute w-8 h-8 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all"
                >
                  {player.number}
                </div>
              ))}

              {/* Jogadores Time Vermelho */}
              {gameState.redTeam.map((player: any) => (
                <div
                  key={player.id}
                  style={{ left: `${player.x}%`, top: `${player.y}%` }}
                  className="absolute w-8 h-8 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all"
                >
                  {player.number}
                </div>
              ))}

              {/* Bola */}
              <div
                style={{
                  left: `${gameState.ball.x}%`,
                  top: `${gameState.ball.y}%`,
                }}
                className="absolute w-6 h-6 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-xl border-2 border-gray-800 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs">
                  ⚽
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-4 text-center">
            👁️ Modo somente visualização - Acompanhe as jogadas em tempo real
          </p>
        </div>
      </div>
    </div>
  );
}
