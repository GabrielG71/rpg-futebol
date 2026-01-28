"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { gameStorage } from "@/lib/firebase";
import {
  RefreshCw,
  Home,
  Users,
  LogOut,
  AlertCircle,
  Edit2,
  Check,
  X,
} from "lucide-react";

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
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // Usar ID do Clerk se disponível, senão gerar um aleatório
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Inicializar usuário
  useEffect(() => {
    if (user) {
      // Usar ID do Clerk
      const clerkId = user.id;
      setUserId(clerkId);

      // Tentar carregar nome salvo, senão usar nome do Clerk ou padrão
      const savedName = localStorage.getItem(`player-name:${clerkId}`);
      if (savedName) {
        setUserName(savedName);
      } else {
        const defaultName =
          user.firstName || `Jogador ${Math.floor(Math.random() * 100)}`;
        setUserName(defaultName);
        localStorage.setItem(`player-name:${clerkId}`, defaultName);
      }

      // Salvar role no localStorage com ID do Clerk
      localStorage.setItem(`user-role:${clerkId}`, "jogador");
    } else {
      // Fallback para usuário anônimo
      const anonId = `user-${Math.random().toString(36).substr(2, 9)}`;
      const anonName = `Jogador ${Math.floor(Math.random() * 100)}`;
      setUserId(anonId);
      setUserName(anonName);
      localStorage.setItem(`user-role:${anonId}`, "jogador");
      localStorage.setItem(`player-name:${anonId}`, anonName);
    }
  }, [user]);

  // Função para voltar ao menu e escolher papel - CORRIGIDA
  const goToMenu = () => {
    if (confirm("Voltar ao menu para escolher outro papel?")) {
      // Remover do localStorage com o ID correto
      if (userId) {
        localStorage.removeItem(`user-role:${userId}`);
      }
      // Forçar recarregamento da página
      window.location.href = "/";
    }
  };

  // Salvar nome do jogador
  const savePlayerName = () => {
    if (tempName.trim()) {
      setUserName(tempName);
      if (userId) {
        localStorage.setItem(`player-name:${userId}`, tempName);
        // Atualizar no Firebase também
        updatePlayerNameInFirebase(tempName);
      }
    }
    setEditingName(false);
    setTempName("");
  };

  // Atualizar nome no Firebase
  const updatePlayerNameInFirebase = async (name: string) => {
    if (!userId) return;

    try {
      const playerRef = ref(database, `players/${userId}/name`);
      await set(playerRef, name);
      console.log("✅ Nome atualizado no Firebase:", name);
    } catch (error) {
      console.error("❌ Erro ao atualizar nome:", error);
    }
  };

  // Registrar presença inicial
  useEffect(() => {
    if (!userId || !userName) return;

    const registerUser = async () => {
      try {
        await gameStorage.registerPlayer(userId, userName, false);
        console.log("✅ Jogador registrado:", userId, userName);
      } catch (error) {
        console.error("❌ Erro ao registrar jogador:", error);
      }
    };

    registerUser();
    setLoading(false);
  }, [userId, userName]);

  // Heartbeat - manter presença ativa
  useEffect(() => {
    if (!userId) return;

    const heartbeat = setInterval(async () => {
      try {
        await gameStorage.updatePlayerPresence(userId);
      } catch (error) {
        console.error("❌ Erro no heartbeat:", error);
      }
    }, 2000);

    return () => clearInterval(heartbeat);
  }, [userId]);

  // Listener em tempo real para o estado do jogo - CORRIGIDO
  useEffect(() => {
    if (!userId) return;

    console.log("🎮 Iniciando listener do jogo para usuário:", userId);

    const unsubscribe = gameStorage.onGameStateChange((fullGame: GameState) => {
      console.log("📡 Jogo atualizado no listener:", {
        gameStarted: fullGame?.gameStarted,
        hasGameState: !!fullGame,
        lastUpdate: new Date().toLocaleTimeString(),
      });

      setLastUpdate(new Date());

      // Se não houver dados do jogo ou partida não iniciada
      if (!fullGame || fullGame.gameStarted !== true) {
        console.log("⏸️ Partida não iniciada ou sem dados");
        setGameState(null);
        return;
      }

      console.log("✅ Partida iniciada! Filtrando jogadores visíveis...");

      const filteredGame = {
        ...fullGame,
        blueTeam:
          fullGame.blueTeam?.filter((p) => p.visibleTo.includes(userId)) || [],
        redTeam:
          fullGame.redTeam?.filter((p) => p.visibleTo.includes(userId)) || [],
      };

      console.log("👁️ Jogadores visíveis:", {
        blue: filteredGame.blueTeam.length,
        red: filteredGame.redTeam.length,
        userId: userId,
      });

      setGameState(filteredGame);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, forceRefresh]);

  // Listener em tempo real para jogadores conectados
  useEffect(() => {
    const unsubscribe = gameStorage.onPlayersChange((players) => {
      setRealPlayers(players);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const toggleActive = async () => {
    if (!userId) return;

    const newActiveState = !isActive;
    setIsActive(newActiveState);

    try {
      await gameStorage.updatePlayerActive(userId, newActiveState);
      console.log(
        `✅ Status atualizado: ${newActiveState ? "Ativo" : "Inativo"}`,
      );
    } catch (error) {
      console.error("❌ Erro ao atualizar status:", error);
    }
  };

  // Função para forçar atualização manual - MELHORADA
  const handleForceRefresh = async () => {
    console.log("🔄 Forçando atualização manual...");
    setForceRefresh((prev) => prev + 1);

    try {
      // Recarrega os dados do Firebase manualmente
      const fullGame = await gameStorage.loadGameState();

      if (!fullGame || fullGame.gameStarted !== true) {
        console.log("⚠️ Partida não iniciada após atualização manual");
        setGameState(null);
        return;
      }

      const filteredGame = {
        ...fullGame,
        blueTeam: fullGame.blueTeam.filter((p) => p.visibleTo.includes(userId)),
        redTeam: fullGame.redTeam.filter((p) => p.visibleTo.includes(userId)),
      };

      setGameState(filteredGame);
      setLastUpdate(new Date());
      console.log("✅ Dados atualizados manualmente!", {
        blue: filteredGame.blueTeam.length,
        red: filteredGame.redTeam.length,
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar manualmente:", error);
    }
  };

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

          {/* Status de sincronização */}
          <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg mb-2">
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
            <span className="text-green-400 text-sm">
              Sincronizando em tempo real...
            </span>
          </div>

          {/* Última atualização */}
          {lastUpdate && (
            <div className="text-xs text-gray-500 mb-2">
              Última verificação: {lastUpdate.toLocaleTimeString()}
            </div>
          )}

          <div className="text-xs text-gray-600 mb-6">
            User ID: {userId.substring(0, 12)}...
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          {/* Editar nome do jogador */}
          <div className="mb-4">
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-gray-700 text-white p-2 rounded"
                  placeholder="Seu nome"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={savePlayerName}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2 rounded flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setTempName("");
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">Seu nome:</div>
                  <div className="text-gray-300">{userName}</div>
                </div>
                <button
                  onClick={() => {
                    setTempName(userName);
                    setEditingName(true);
                  }}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

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

          {/* Botões de ação */}
          <div className="space-y-3">
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

            <button
              onClick={handleForceRefresh}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Atualizar Agora
            </button>

            <button
              onClick={goToMenu}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Trocar de Papel
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-gray-300 text-xs">
                <p className="font-semibold">Dica:</p>
                <p>
                  Clique em "Atualizar Agora" quando o mestre fizer alguma
                  alteração.
                </p>
                <p>
                  Use "Trocar de Papel" para virar mestre ou criar novo jogador.
                </p>
              </div>
            </div>
          </div>

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
        {/* Header com botões de ação */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl">⚽</div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
                👁️ Visualização
              </h1>
              <div className="flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-gray-700 text-white p-1 rounded text-sm"
                      autoFocus
                    />
                    <button
                      onClick={savePlayerName}
                      className="bg-green-600 hover:bg-green-700 p-1 rounded"
                    >
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setTempName("");
                      }}
                      className="bg-gray-600 hover:bg-gray-500 p-1 rounded"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-400 text-sm md:text-base">
                      Bem-vindo, {userName}!
                    </p>
                    <button
                      onClick={() => {
                        setTempName(userName);
                        setEditingName(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleForceRefresh}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar</span>
            </button>

            <button
              onClick={goToMenu}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Trocar Papel</span>
            </button>
          </div>
        </div>

        {/* Status e tempo da última atualização */}
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${isActive ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
                />
                <span className="text-white text-sm">
                  {isActive ? "Participante Ativo" : "Espectador"}
                </span>
              </div>
            </div>

            {lastUpdate && (
              <div className="text-gray-400 text-sm">
                Última atualização: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Controle de participação */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
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

        {/* Placar e Tempo */}
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

        {/* Contador de jogadores visíveis */}
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

            <button
              onClick={handleForceRefresh}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </button>
          </div>
        </div>

        {/* Campo de Jogo - COM PREVENÇÃO DE ARRASTAR IMAGEM */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">Campo de Jogo</h3>
            <button
              onClick={handleForceRefresh}
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Atualizar Campo
            </button>
          </div>

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
                    <button
                      onClick={handleForceRefresh}
                      className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Verificar novamente
                    </button>
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
                    // Prevenir arrastar imagem
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none" // Adicionado pointer-events-none
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                      />
                    ) : assignedPlayer ? (
                      <div className="text-base md:text-lg pointer-events-none">
                        {assignedPlayer.avatar}
                      </div>
                    ) : (
                      <div className="pointer-events-none">{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
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
                    // Prevenir arrastar imagem
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none" // Adicionado pointer-events-none
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                      />
                    ) : assignedPlayer ? (
                      <div className="text-base md:text-lg pointer-events-none">
                        {assignedPlayer.avatar}
                      </div>
                    ) : (
                      <div className="pointer-events-none">{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] md:text-[10px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-300 text-sm font-semibold">
                  👁️ Modo Visualização - Somente Leitura
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Passe o mouse sobre os jogadores para ver os nomes
                </p>
              </div>
              <button
                onClick={handleForceRefresh}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Nota sobre atualizações */}
        <div className="mt-4 p-3 bg-yellow-900 border border-yellow-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-300 mt-0.5 flex-shrink-0" />
            <div className="text-yellow-200 text-xs">
              <p className="font-semibold">Nota:</p>
              <p>
                Se o mestre fez uma alteração e você não está vendo, clique no
                botão "Atualizar" para forçar a sincronização.
              </p>
              <p>
                Para trocar de papel (virar mestre ou criar novo jogador), use o
                botão "Trocar Papel".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
