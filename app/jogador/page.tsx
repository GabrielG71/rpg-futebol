"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { gameStorage } from "@/lib/firebase";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import {
  RefreshCw,
  Home,
  Users,
  AlertCircle,
  Edit2,
  Check,
  X,
  Eye,
  EyeOff,
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
  isActive: boolean;
}

export default function JogadorPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [debugMode, setDebugMode] = useState(false);

  // IDs do usuário
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("👤");

  // Inicializar usuário
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      // Usar ID do Clerk
      const clerkId = user.id;
      setUserId(clerkId);

      // Gerar nome e avatar
      const savedName = localStorage.getItem(`player-name:${clerkId}`);
      const savedAvatar = localStorage.getItem(`player-avatar:${clerkId}`);

      if (savedName) {
        setUserName(savedName);
      } else {
        const defaultName =
          user.firstName || `Jogador${Math.floor(Math.random() * 1000)}`;
        setUserName(defaultName);
        localStorage.setItem(`player-name:${clerkId}`, defaultName);
      }

      if (savedAvatar) {
        setUserAvatar(savedAvatar);
      } else {
        const avatars = [
          "👤",
          "⚽",
          "🥅",
          "👟",
          "🦵",
          "🧤",
          "🎯",
          "🚀",
          "⭐",
          "🏆",
        ];
        const randomAvatar =
          avatars[Math.floor(Math.random() * avatars.length)];
        setUserAvatar(randomAvatar);
        localStorage.setItem(`player-avatar:${clerkId}`, randomAvatar);
      }

      // Salvar role
      localStorage.setItem(`user-role:${clerkId}`, "jogador");

      // Registrar usuário
      registerUser(clerkId, userName, userAvatar);
    } else {
      // Usuário anônimo
      const anonId = `anon-${Math.random().toString(36).substr(2, 9)}`;
      const anonName = `Jogador${Math.floor(Math.random() * 1000)}`;
      const avatars = [
        "👤",
        "⚽",
        "🥅",
        "👟",
        "🦵",
        "🧤",
        "🎯",
        "🚀",
        "⭐",
        "🏆",
      ];
      const anonAvatar = avatars[Math.floor(Math.random() * avatars.length)];

      setUserId(anonId);
      setUserName(anonName);
      setUserAvatar(anonAvatar);

      localStorage.setItem(`user-role:${anonId}`, "jogador");
      localStorage.setItem(`player-name:${anonId}`, anonName);
      localStorage.setItem(`player-avatar:${anonId}`, anonAvatar);

      registerUser(anonId, anonName, anonAvatar);
    }

    setLoading(false);
  }, [isLoaded, user]);

  // Registrar usuário no Firebase
  const registerUser = async (id: string, name: string, avatar: string) => {
    try {
      await gameStorage.registerPlayer(id, name, false, avatar);
      console.log("✅ Jogador registrado:", { id, name, avatar });
    } catch (error) {
      console.error("❌ Erro ao registrar jogador:", error);
    }
  };

  // Heartbeat - manter presença ativa
  useEffect(() => {
    if (!userId) return;

    const heartbeat = setInterval(async () => {
      try {
        await gameStorage.updatePlayerPresence(userId);
      } catch (error) {
        console.error("❌ Erro no heartbeat:", error);
      }
    }, 3000);

    return () => clearInterval(heartbeat);
  }, [userId]);

  // Listener em tempo real para o estado do jogo
  useEffect(() => {
    if (!userId) return;

    console.log("🎮 Configurando listener do jogo para:", userId);

    const unsubscribe = gameStorage.onGameStateChange((fullGame: GameState) => {
      console.log("📡 Dados recebidos do Firebase:", {
        hasData: !!fullGame,
        gameStarted: fullGame?.gameStarted,
        timestamp: new Date().toLocaleTimeString(),
        userId: userId,
      });

      setLastUpdate(new Date());

      if (!fullGame) {
        console.log("❌ Nenhum dado do jogo recebido");
        setGameState(null);
        return;
      }

      // DEBUG: Log completo se debugMode estiver ativo
      if (debugMode) {
        console.log("🔍 DEBUG - Estado completo:", fullGame);
        console.log("🔍 gameStarted type:", typeof fullGame.gameStarted);
        console.log("🔍 gameStarted value:", fullGame.gameStarted);
      }

      // Verificar se o jogo foi iniciado
      if (fullGame.gameStarted !== true) {
        console.log(
          "⏸️ Partida não iniciada (gameStarted:",
          fullGame.gameStarted,
          ")",
        );
        setGameState(null);
        return;
      }

      console.log("✅ Partida INICIADA! Processando...");

      // Filtrar jogadores visíveis
      const filteredGame = {
        ...fullGame,
        blueTeam: (fullGame.blueTeam || []).filter(
          (p) => p.visibleTo && p.visibleTo.includes(userId),
        ),
        redTeam: (fullGame.redTeam || []).filter(
          (p) => p.visibleTo && p.visibleTo.includes(userId),
        ),
      };

      console.log("👁️ Jogadores visíveis após filtro:", {
        blue: filteredGame.blueTeam.length,
        red: filteredGame.redTeam.length,
        total: filteredGame.blueTeam.length + filteredGame.redTeam.length,
      });

      setGameState(filteredGame);
    });

    return () => {
      console.log("🧹 Removendo listener do jogo");
      if (unsubscribe) unsubscribe();
    };
  }, [userId, forceRefresh, debugMode]);

  // Listener para jogadores conectados
  useEffect(() => {
    const unsubscribe = gameStorage.onPlayersChange((players) => {
      setRealPlayers(players);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Função para voltar ao menu
  const goToMenu = () => {
    if (confirm("Voltar ao menu para escolher outro papel?")) {
      if (userId) {
        localStorage.removeItem(`user-role:${userId}`);
      }
      window.location.href = "/";
    }
  };

  // Atualizar nome do jogador
  const savePlayerName = async () => {
    if (!tempName.trim() || !userId) return;

    const newName = tempName.trim();
    setUserName(newName);
    localStorage.setItem(`player-name:${userId}`, newName);

    try {
      // Atualizar no Firebase
      const playerRef = ref(database, `players/${userId}/name`);
      await set(playerRef, newName);
      console.log("✅ Nome atualizado no Firebase:", newName);
    } catch (error) {
      console.error("❌ Erro ao atualizar nome:", error);
    }

    setEditingName(false);
    setTempName("");
  };

  // Ativar/desativar participação
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

  // Forçar atualização manual
  const handleForceRefresh = async () => {
    console.log("🔄 Forçando atualização manual...");
    setForceRefresh((prev) => prev + 1);

    try {
      const fullGame = await gameStorage.loadGameState();
      console.log("📦 Dados carregados manualmente:", {
        hasData: !!fullGame,
        gameStarted: fullGame?.gameStarted,
      });

      if (!fullGame || fullGame.gameStarted !== true) {
        console.log("⚠️ Partida não iniciada após atualização manual");
        setGameState(null);
        return;
      }

      const filteredGame = {
        ...fullGame,
        blueTeam: (fullGame.blueTeam || []).filter(
          (p) => p.visibleTo && p.visibleTo.includes(userId),
        ),
        redTeam: (fullGame.redTeam || []).filter(
          (p) => p.visibleTo && p.visibleTo.includes(userId),
        ),
      };

      setGameState(filteredGame);
      setLastUpdate(new Date());
      console.log("✅ Dados atualizados manualmente!");
    } catch (error) {
      console.error("❌ Erro ao atualizar manualmente:", error);
    }
  };

  // Debug function
  const toggleDebug = () => {
    setDebugMode(!debugMode);
    console.log(`🐛 Debug mode ${!debugMode ? "ativado" : "desativado"}`);
  };

  const getPlayerById = (id?: string) => realPlayers.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  // Se não houver gameState (partida não iniciada ou sem dados visíveis)
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
            ID: {userId.substring(0, 15)}...
            <button
              onClick={toggleDebug}
              className="ml-2 text-blue-400 hover:text-blue-300"
            >
              {debugMode ? "🐛 Debug ON" : "🐛 Debug OFF"}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
          {/* Editar nome do jogador */}
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full bg-gray-600 text-white p-2 rounded"
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
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{userAvatar}</div>
                  <div>
                    <div className="text-white font-semibold">{userName}</div>
                    <div className="text-gray-400 text-xs">Seu personagem</div>
                  </div>
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
              {isActive ? (
                <>
                  <EyeOff className="w-5 h-5" />
                  Sair da Partida
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  Entrar na Partida
                </>
              )}
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
                  O mestre precisa: 1) Iniciar a partida, 2) Tornar jogadores
                  visíveis para você
                </p>
                <p>Use "Atualizar Agora" quando o mestre fizer alterações.</p>
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
                👁️ Visualização do Jogo
                {debugMode && (
                  <span className="text-red-400 text-sm">🐛 DEBUG</span>
                )}
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
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{userAvatar}</span>
                      <p className="text-gray-400 text-sm md:text-base">
                        {userName}
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
                    </div>
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

            <button
              onClick={toggleDebug}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 ${debugMode ? "bg-red-600 hover:bg-red-700" : "bg-gray-600 hover:bg-gray-500"} text-white`}
            >
              🐛
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
                  {isActive ? "✅ Participante Ativo" : "👁️ Espectador"}
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

        {/* Placar e Tempo */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  {totalVisiblePlayers === 0
                    ? "Nenhum jogador visível para você"
                    : `Você está vendo ${totalVisiblePlayers} jogador${totalVisiblePlayers !== 1 ? "es" : ""}`}
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

        {/* Campo de Jogo */}
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
                  <div className="bg-gray-900 bg-opacity-90 rounded-lg p-6 text-center max-w-md mx-4">
                    <div className="text-6xl mb-3">👁️</div>
                    <div className="text-white font-bold mb-2">
                      Nenhum jogador visível
                    </div>
                    <div className="text-gray-400 text-sm mb-3">
                      O mestre ainda não liberou nenhum jogador para você
                      visualizar. Peça ao mestre para:
                    </div>
                    <ol className="text-gray-300 text-sm text-left list-decimal pl-5 mb-4">
                      <li>Clique em "Visível para Todos" no painel</li>
                      <li>
                        Ou configure a visibilidade manualmente nos jogadores
                      </li>
                    </ol>
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
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
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
                  >
                    {player.customImage ? (
                      <img
                        src={player.customImage}
                        alt=""
                        className="w-full h-full object-cover pointer-events-none"
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
              <p className="font-semibold">Como ver o campo:</p>
              <p>1. Mestre deve iniciar a partida</p>
              <p>2. Mestre deve tornar jogadores visíveis para você</p>
              <p>3. Clique em "Atualizar" para sincronizar</p>
              <p>
                4. Se ainda não ver, peça ao mestre para clicar em "Visível para
                Todos"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
