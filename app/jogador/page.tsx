"use client";

import { useState, useEffect } from "react";

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  assignedTo?: string;
  visibleTo: string[];
  customImage?: string;
}

interface GameState {
  blueTeamName: string;
  redTeamName: string;
  blueTeam: Player[];
  redTeam: Player[];
  ball: { x: number; y: number };
  displayTime: string;
  score: { blue: number; red: number };
  fieldImage?: string;
  gameStarted?: boolean;
}

interface RealPlayer {
  id: string;
  name: string;
  avatar: string;
}

export default function JogadorPage() {
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [userId] = useState(
    () => `user-${Math.random().toString(36).substr(2, 9)}`,
  );
  const [userName] = useState(
    () => `Jogador ${Math.floor(Math.random() * 100)}`,
  );

  useEffect(() => {
    registerPresence();
    setLoading(false);
  }, []);

  const registerPresence = async () => {
    try {
      const existingInfo = await window.storage.get(
        `user-info:${userId}`,
        true,
      );

      const userInfo = {
        name: userName,
        avatar: "👤",
        isActive: false,
        lastSeen: Date.now(),
      };

      if (existingInfo && existingInfo.value) {
        const info = JSON.parse(existingInfo.value);
        userInfo.isActive = info.isActive !== false;
        setIsActive(info.isActive !== false);
      } else {
        setIsActive(false);
      }

      await window.storage.set(
        `user-info:${userId}`,
        JSON.stringify(userInfo),
        true,
      );
    } catch (error) {
      console.log("Erro ao registrar presença:", error);
      setIsActive(false);
    }
  };

  useEffect(() => {
    const updatePresence = async () => {
      try {
        const existingInfo = await window.storage.get(
          `user-info:${userId}`,
          true,
        );
        if (existingInfo && existingInfo.value) {
          const info = JSON.parse(existingInfo.value);
          info.lastSeen = Date.now();
          await window.storage.set(
            `user-info:${userId}`,
            JSON.stringify(info),
            true,
          );
        }
      } catch (error) {
        console.log("Erro ao atualizar presença:", error);
      }
    };

    const interval = setInterval(updatePresence, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  const toggleActive = async () => {
    const newActiveState = !isActive;
    setIsActive(newActiveState);

    const userInfo = {
      name: userName,
      avatar: "👤",
      isActive: newActiveState,
      lastSeen: Date.now(),
    };

    try {
      await window.storage.set(
        `user-info:${userId}`,
        JSON.stringify(userInfo),
        true,
      );
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const refreshGame = () => {
    loadPlayers();
    loadGame();
  };

  const loadPlayers = async () => {
    try {
      const result = await window.storage.list("user-info:", true);
      if (result && result.keys) {
        const players: RealPlayer[] = [];

        for (const key of result.keys) {
          try {
            const userInfo = await window.storage.get(key, true);
            if (userInfo && userInfo.value) {
              const info = JSON.parse(userInfo.value);
              players.push({
                id: key.replace("user-info:", ""),
                name: info.name,
                avatar: info.avatar || "👤",
              });
            }
          } catch (error) {
            console.log("Erro ao carregar jogador:", error);
          }
        }

        setRealPlayers(players);
      }
    } catch (error) {
      console.log("Erro ao listar jogadores:", error);
    }
  };

  const loadGame = async () => {
    try {
      const result = await window.storage.get("current-game", true);
      if (result && result.value) {
        const fullGame: GameState = JSON.parse(result.value);

        // Verificar se a partida foi iniciada
        if (!fullGame.gameStarted) {
          setGameState(null);
          return;
        }

        const filteredGame = {
          ...fullGame,
          blueTeam: fullGame.blueTeam.filter((p) =>
            p.visibleTo.includes(userId),
          ),
          redTeam: fullGame.redTeam.filter((p) => p.visibleTo.includes(userId)),
        };

        setGameState(filteredGame);
      } else {
        setGameState(null);
      }
    } catch (error) {
      console.log("Nenhum jogo encontrado:", error);
      setGameState(null);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    loadGame();
    const interval = setInterval(loadGame, 1000);
    return () => clearInterval(interval);
  }, [userId]);

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
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚽</div>
          <div className="text-white text-2xl mb-2">
            Aguardando o mestre iniciar a partida...
          </div>
          <div className="text-gray-400 text-sm mb-4">
            O jogo aparecerá aqui assim que o mestre configurar tudo
          </div>
          <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <svg
              className="w-4 h-4 text-green-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-green-400 text-sm">Verificando...</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold">Status da Partida</h3>
              <p className="text-gray-400 text-sm">
                {isActive ? "Você está participando" : "Você está assistindo"}
              </p>
            </div>
            <div
              className={`w-3 h-3 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
            />
          </div>

          <button
            onClick={toggleActive}
            className={`w-full px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              isActive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isActive ? "🚪 Sair da Partida" : "✅ Entrar na Partida"}
          </button>

          <p className="text-gray-500 text-xs text-center mt-3">
            {isActive
              ? "O mestre poderá te atribuir a uma posição no campo"
              : "Você pode assistir a partida sem participar"}
          </p>
        </div>
      </div>
    );
  }

  const totalVisiblePlayers =
    gameState.blueTeam.length + gameState.redTeam.length;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl">⚽</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                👁️ Visualização
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                Bem-vindo, {userName}!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-4 h-4 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
              />
              <div>
                <div className="text-white font-bold">
                  {isActive ? "🎮 Participante Ativo" : "👁️ Espectador"}
                </div>
                <div className="text-gray-400 text-sm">
                  {isActive
                    ? "O mestre pode te colocar em jogo"
                    : "Você está apenas assistindo"}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={refreshGame}
                className="px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                🔄 <span className="hidden sm:inline">Atualizar</span>
              </button>

              <button
                onClick={toggleActive}
                className={`px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isActive ? "🚪 Sair da Partida" : "✅ Entrar na Partida"}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 md:p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                👥 Placar
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

            <div className="bg-gray-700 rounded-lg p-4 md:p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                ⏱️ Tempo de Jogo
              </h3>
              <div className="text-5xl md:text-6xl font-bold text-white text-center mb-2">
                {gameState.displayTime}
              </div>
              <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Atualização em tempo real
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👁️</span>
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

        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <h3 className="text-white font-bold mb-4">Campo de Jogo</h3>
          <div
            className="relative w-full rounded-lg overflow-hidden"
            style={{
              paddingBottom: "66.67%",
              backgroundImage: gameState.fieldImage
                ? `url(${gameState.fieldImage})`
                : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: gameState.fieldImage ? "transparent" : "#15803d",
            }}
          >
            <div className="absolute inset-0">
              {!gameState.fieldImage && (
                <>
                  <div className="absolute inset-0 border-4 border-white opacity-50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white opacity-50" />
                  <div className="absolute left-1/2 top-1/2 w-20 h-20 border-4 border-white rounded-full opacity-50 -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute left-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2" />
                  <div className="absolute right-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2" />
                </>
              )}

              {totalVisiblePlayers === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900 bg-opacity-90 rounded-lg p-6 text-center">
                    <div className="text-6xl mb-3">👁️</div>
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

              {gameState.blueTeam.map((player) => {
                const assignedPlayer = getPlayerById(player.assignedTo);
                return (
                  <div
                    key={player.id}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-8 h-8 md:w-10 md:h-10 bg-blue-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all group overflow-hidden"
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : assignedPlayer ? (
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

              {gameState.redTeam.map((player) => {
                const assignedPlayer = getPlayerById(player.assignedTo);
                return (
                  <div
                    key={player.id}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-8 h-8 md:w-10 md:h-10 bg-red-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs transform -translate-x-1/2 -translate-y-1/2 shadow-lg transition-all group overflow-hidden"
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : assignedPlayer ? (
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
