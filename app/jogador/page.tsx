"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, Clock, Eye, RefreshCw } from "lucide-react";

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

interface RealPlayer {
  id: string;
  name: string;
  avatar: string;
}

export default function JogadorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey);

    if (savedRole !== "jogador") {
      router.push("/");
      return;
    }

    // Salvar informações do usuário para o mestre ver
    const userInfo = {
      name: user.firstName || user.username || "Jogador",
      avatar: user.imageUrl ? "🎮" : "👤",
    };
    localStorage.setItem(`user-info:${user.id}`, JSON.stringify(userInfo));

    setLoading(false);
  }, [user, isLoaded, router]);

  // Carregar lista de jogadores
  useEffect(() => {
    const loadPlayers = () => {
      const players: RealPlayer[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("user-info:")) {
          const userId = key.replace("user-info:", "");
          const userInfo = localStorage.getItem(key);
          if (userInfo) {
            const info = JSON.parse(userInfo);
            players.push({
              id: userId,
              name: info.name,
              avatar: info.avatar || "👤",
            });
          }
        }
      }

      setRealPlayers(players);
    };

    loadPlayers();
  }, []);

  // Carregar estado do jogo a cada 1 segundo
  useEffect(() => {
    if (!user) return;

    const loadGame = () => {
      const gameData = localStorage.getItem("current-game");
      if (gameData) {
        const fullGame: GameState = JSON.parse(gameData);

        // Filtrar apenas jogadores visíveis para este jogador
        const filteredGame = {
          ...fullGame,
          blueTeam: fullGame.blueTeam.filter((p) =>
            p.visibleTo.includes(user.id),
          ),
          redTeam: fullGame.redTeam.filter((p) =>
            p.visibleTo.includes(user.id),
          ),
        };

        setGameState(filteredGame);
      }
    };

    loadGame();
    const interval = setInterval(loadGame, 1000);

    return () => clearInterval(interval);
  }, [user]);

  const getPlayerById = (id?: string) => realPlayers.find((p) => p.id === id);

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
          <div className="text-gray-400 text-sm mb-4">
            O jogo aparecerá aqui assim que o mestre configurar tudo
          </div>
          <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <RefreshCw className="w-4 h-4 text-green-400 animate-spin" />
            <span className="text-green-400 text-sm">Verificando...</span>
          </div>
        </div>
      </div>
    );
  }

  const totalVisiblePlayers =
    gameState.blueTeam.length + gameState.redTeam.length;

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
                Bem-vindo, {user?.firstName || "Jogador"}!
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
              <div className="text-5xl md:text-6xl font-bold text-white text-center mb-2">
                {gameState.displayTime}
              </div>
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                Atualização em tempo real
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white font-semibold">
                  Você está vendo {totalVisiblePlayers} jogador
                  {totalVisiblePlayers !== 1 ? "es" : ""}
                </div>
                <div className="text-gray-400 text-sm">
                  {gameState.blueTeam.length} do {gameState.blueTeamName} •{" "}
                  {gameState.redTeam.length} do {gameState.redTeamName}
                </div>
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

              {/* Mensagem se não houver jogadores visíveis */}
              {totalVisiblePlayers === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900 bg-opacity-90 rounded-lg p-6 text-center">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-white font-bold mb-2">
                      Nenhum jogador visível
                    </div>
                    <div className="text-gray-400 text-sm">
                      O mestre ainda não liberou nenhum jogador para você
                      visualizar
                    </div>
                  </div>
                </div>
              )}

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
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
            <p className="text-gray-300 text-sm text-center font-semibold">
              👁️ Modo Visualização - Somente Leitura
            </p>
            <p className="text-gray-500 text-xs text-center mt-1">
              Passe o mouse sobre os jogadores para ver os nomes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
