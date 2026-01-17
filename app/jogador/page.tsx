"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, Clock, Eye } from "lucide-react";

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  assignedTo?: string;
  visibleTo: string[];
}

interface GameState {
  blueTeamName: string;
  redTeamName: string;
  blueTeam: Player[];
  redTeam: Player[];
  ball: { x: number; y: number };
  displayTime: string;
  score: { blue: number; red: number };
}

export default function JogadorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>("p1"); // Simulação - depois vem do backend

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey);

    if (savedRole !== "jogador") {
      router.push("/");
      return;
    }

    setLoading(false);
  }, [user, isLoaded, router]);

  // Carregar estado do jogo a cada 1 segundo
  useEffect(() => {
    const loadGame = () => {
      const gameData = localStorage.getItem("current-game");
      if (gameData) {
        const fullGame: GameState = JSON.parse(gameData);

        // Filtrar apenas jogadores visíveis para este jogador
        const filteredGame = {
          ...fullGame,
          blueTeam: fullGame.blueTeam.filter((p) =>
            p.visibleTo.includes(myPlayerId),
          ),
          redTeam: fullGame.redTeam.filter((p) =>
            p.visibleTo.includes(myPlayerId),
          ),
        };

        setGameState(filteredGame);
      }
    };

    loadGame();
    const interval = setInterval(loadGame, 1000);

    return () => clearInterval(interval);
  }, [myPlayerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚽</div>
          <div className="text-white text-2xl mb-2">
            Aguardando o mestre iniciar a partida...
          </div>
          <div className="text-gray-400 text-sm">
            O jogo aparecerá aqui assim que o mestre configurar tudo
          </div>
        </div>
      </div>
    );
  }

  // Avatar simulado - depois vem do backend
  const realPlayers = [
    { id: "p1", name: "João Silva", avatar: "👤" },
    { id: "p2", name: "Maria Costa", avatar: "👩" },
    { id: "p3", name: "Pedro Santos", avatar: "👨" },
    { id: "p4", name: "Ana Lima", avatar: "👧" },
  ];

  const getPlayerById = (id?: string) => realPlayers.find((p) => p.id === id);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl">⚽</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                <Eye className="w-6 h-6 md:w-8 md:h-8" />
                Visualização
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                Acompanhando a partida
              </p>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Informações do Jogo */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Placar */}
            <div className="bg-gray-700 rounded-lg p-4 md:p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" /> Placar
              </h3>
              <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                  <div className="text-blue-400 font-bold mb-2 text-sm md:text-base">
                    {gameState.blueTeamName}
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    {gameState.score.blue}
                  </div>
                </div>
                <div className="text-white text-2xl md:text-3xl font-bold px-4">
                  X
                </div>
                <div className="text-center flex-1">
                  <div className="text-red-400 font-bold mb-2 text-sm md:text-base">
                    {gameState.redTeamName}
                  </div>
                  <div className="text-4xl md:text-5xl font-bold text-white">
                    {gameState.score.red}
                  </div>
                </div>
              </div>
            </div>

            {/* Tempo */}
            <div className="bg-gray-700 rounded-lg p-4 md:p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Tempo de Jogo
              </h3>
              <div className="text-5xl md:text-6xl font-bold text-white text-center">
                {gameState.displayTime}
              </div>
            </div>
          </div>
        </div>

        {/* Campo */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
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

              {/* Gols */}
              <div className="absolute left-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>
              <div className="absolute right-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>

              {/* Jogadores Time Azul (apenas visíveis) */}
              {gameState.blueTeam.map((player) => {
                const assignedPlayer = getPlayerById(player.assignedTo);
                return (
                  <div
                    key={player.id}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-8 h-8 md:w-10 md:h-10 bg-blue-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all group"
                  >
                    {assignedPlayer ? (
                      <div className="text-base md:text-lg">
                        {assignedPlayer.avatar}
                      </div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {assignedPlayer.name}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Jogadores Time Vermelho (apenas visíveis) */}
              {gameState.redTeam.map((player) => {
                const assignedPlayer = getPlayerById(player.assignedTo);
                return (
                  <div
                    key={player.id}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-8 h-8 md:w-10 md:h-10 bg-red-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all group"
                  >
                    {assignedPlayer ? (
                      <div className="text-base md:text-lg">
                        {assignedPlayer.avatar}
                      </div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {assignedPlayer.name}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bola */}
              <div
                style={{
                  left: `${gameState.ball.x}%`,
                  top: `${gameState.ball.y}%`,
                }}
                className="absolute w-5 h-5 md:w-6 md:h-6 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-xl border-2 border-gray-800 transition-all"
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs">
                  ⚽
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 bg-gray-700 rounded-lg p-3">
            <p className="text-gray-400 text-sm text-center">
              👁️{" "}
              <strong className="text-white">Modo somente visualização</strong>
            </p>
            <p className="text-gray-500 text-xs text-center mt-1">
              Você está vendo apenas os jogadores que o mestre liberou para você
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
