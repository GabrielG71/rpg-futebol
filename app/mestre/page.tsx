"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  RotateCcw,
  Users,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  X,
  Check,
  Trash2,
  Home,
  Grid3x3,
  RefreshCw,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

declare global {
  interface Window {
    storage: {
      get: (key: string, persistent: boolean) => Promise<any>;
      set: (key: string, value: string, persistent: boolean) => Promise<void>;
      list: (prefix: string, persistent: boolean) => Promise<any>;
      delete: (key: string, persistent: boolean) => Promise<void>;
    };
  }
}

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  assignedTo?: string;
  visibleTo: string[];
  customImage?: string;
}

interface RealPlayer {
  id: string;
  name: string;
  avatar: string;
  isActive: boolean;
}

const FORMATIONS = {
  "3-4-3": [
    { x: 10, y: 50 },
    { x: 20, y: 25 },
    { x: 20, y: 50 },
    { x: 20, y: 75 },
    { x: 35, y: 20 },
    { x: 35, y: 40 },
    { x: 35, y: 60 },
    { x: 35, y: 80 },
    { x: 45, y: 30 },
    { x: 45, y: 50 },
    { x: 45, y: 70 },
  ],
  "4-2-4": [
    { x: 10, y: 50 },
    { x: 20, y: 20 },
    { x: 20, y: 40 },
    { x: 20, y: 60 },
    { x: 20, y: 80 },
    { x: 32, y: 40 },
    { x: 32, y: 60 },
    { x: 45, y: 20 },
    { x: 45, y: 40 },
    { x: 45, y: 60 },
    { x: 45, y: 80 },
  ],
  "4-4-2": [
    { x: 10, y: 50 },
    { x: 20, y: 20 },
    { x: 20, y: 40 },
    { x: 20, y: 60 },
    { x: 20, y: 80 },
    { x: 32, y: 20 },
    { x: 32, y: 40 },
    { x: 32, y: 60 },
    { x: 32, y: 80 },
    { x: 45, y: 40 },
    { x: 45, y: 60 },
  ],
  "4-3-3": [
    { x: 10, y: 50 },
    { x: 20, y: 20 },
    { x: 20, y: 40 },
    { x: 20, y: 60 },
    { x: 20, y: 80 },
    { x: 32, y: 30 },
    { x: 32, y: 50 },
    { x: 32, y: 70 },
    { x: 45, y: 30 },
    { x: 45, y: 50 },
    { x: 45, y: 70 },
  ],
  "5-4-1": [
    { x: 10, y: 50 },
    { x: 20, y: 15 },
    { x: 20, y: 35 },
    { x: 20, y: 50 },
    { x: 20, y: 65 },
    { x: 20, y: 85 },
    { x: 32, y: 25 },
    { x: 32, y: 42 },
    { x: 32, y: 58 },
    { x: 32, y: 75 },
    { x: 45, y: 50 },
  ],
};

export default function MestrePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedPlayerButton, setSelectedPlayerButton] = useState<string | null>(null);
  const [editingTeamNames, setEditingTeamNames] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState("");
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([]);
  const [showFormations, setShowFormations] = useState(false);
  const [selectedTeamForFormation, setSelectedTeamForFormation] = useState<"blue" | "red" | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);

  const [gameState, setGameState] = useState({
    blueTeamName: "Time Azul",
    redTeamName: "Time Vermelho",
    blueTeam: Array(11)
      .fill(null)
      .map((_, i) => ({
        id: `blue-${i}`,
        x: 15 + (i % 4) * 10,
        y: 20 + Math.floor(i / 4) * 20,
        number: i + 1,
        visibleTo: [] as string[],
        customImage: undefined,
        assignedTo: undefined,
      })),
    redTeam: Array(11)
      .fill(null)
      .map((_, i) => ({
        id: `red-${i}`,
        x: 65 + (i % 4) * 10,
        y: 20 + Math.floor(i / 4) * 20,
        number: i + 1,
        visibleTo: [] as string[],
        customImage: undefined,
        assignedTo: undefined,
      })),
    ball: { x: 50, y: 50 },
    displayTime: "00:00",
    score: { blue: 0, red: 0 },
    fieldImage: undefined as string | undefined,
    gameStarted: false,
  });

  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey);

    if (savedRole !== "mestre") {
      router.push("/");
      return;
    }

    loadGame();
    loadConnectedPlayers();
    setLoading(false);
  }, [user, isLoaded, router]);

  const loadGame = async () => {
    try {
      const result = await window.storage.get("current-game", true);
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        setGameState(parsed);
      }
    } catch (error) {
      console.log("Nenhum jogo salvo ainda");
    }
  };

  const saveGame = async (state: typeof gameState) => {
    try {
      await window.storage.set("current-game", JSON.stringify(state), true);
    } catch (error) {
      console.error("Erro ao salvar jogo:", error);
    }
  };

  useEffect(() => {
    if (!loading) {
      saveGame(gameState);
    }
  }, [gameState, loading]);

  const loadConnectedPlayers = async () => {
    try {
      const result = await window.storage.list("user-info:", true);
      if (result && result.keys) {
        const players: RealPlayer[] = [];
        
        for (const key of result.keys) {
          try {
            const userInfo = await window.storage.get(key, true);
            if (userInfo && userInfo.value) {
              const info = JSON.parse(userInfo.value);
              const now = Date.now();
              const lastSeen = info.lastSeen || 0;
              const isOnline = now - lastSeen < 10000;

              if (isOnline) {
                players.push({
                  id: key.replace("user-info:", ""),
                  name: info.name,
                  avatar: info.avatar || "👤",
                  isActive: info.isActive !== false,
                });
              }
            }
          } catch (error) {
            console.log("Erro ao carregar info do jogador:", error);
          }
        }
        
        setRealPlayers(players);
      }
    } catch (error) {
      console.log("Erro ao listar jogadores:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(loadConnectedPlayers, 3000);
    return () => clearInterval(interval);
  }, []);

  const goToMenu = () => {
    if (confirm("Voltar ao menu? Você precisará escolher sua função novamente.")) {
      if (user) {
        localStorage.removeItem(`user-role:${user.id}`);
      }
      router.push("/");
    }
  };

  const applyFormation = (formationName: keyof typeof FORMATIONS, team: "blue" | "red") => {
    const formation = FORMATIONS[formationName];
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player, index) => ({
        ...player,
        x: team === "blue" ? formation[index].x : 100 - formation[index].x,
        y: formation[index].y,
      })),
    }));

    setShowFormations(false);
    setSelectedTeamForFormation(null);
  };

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

    const [team] = dragging.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) =>
        player.id === dragging ? { ...player, x, y } : player
      ),
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const resetGame = () => {
    if (!confirm("Tem certeza que deseja resetar todo o jogo?")) return;

    const newState = {
      blueTeamName: "Time Azul",
      redTeamName: "Time Vermelho",
      blueTeam: Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `blue-${i}`,
          x: 15 + (i % 4) * 10,
          y: 20 + Math.floor(i / 4) * 20,
          number: i + 1,
          visibleTo: [] as string[],
          customImage: undefined,
          assignedTo: undefined,
        })),
      redTeam: Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `red-${i}`,
          x: 65 + (i % 4) * 10,
          y: 20 + Math.floor(i / 4) * 20,
          number: i + 1,
          visibleTo: [] as string[],
          customImage: undefined,
          assignedTo: undefined,
        })),
      ball: { x: 50, y: 50 },
      displayTime: "00:00",
      score: { blue: 0, red: 0 },
      fieldImage: undefined,
      gameStarted: false,
    };

    setGameState(newState);
  };

  const startGame = () => {
    setGameState((prev) => ({ ...prev, gameStarted: true }));
  };

  const endGame = () => {
    if (!confirm("Finalizar a partida? Os jogadores não verão mais o jogo.")) return;
    setGameState((prev) => ({ ...prev, gameStarted: false }));
  };

  const assignPlayerToButton = (buttonId: string, playerId: string | null) => {
    const [team] = buttonId.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) =>
        player.id === buttonId ? { ...player, assignedTo: playerId || undefined } : player
      ),
    }));
    setSelectedPlayerButton(null);
  };

  const togglePlayerVisibility = (buttonId: string, playerId: string) => {
    const [team] = buttonId.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) => {
        if (player.id === buttonId) {
          const visibleTo = player.visibleTo.includes(playerId)
            ? player.visibleTo.filter((id) => id !== playerId)
            : [...player.visibleTo, playerId];
          return { ...player, visibleTo };
        }
        return player;
      }),
    }));
  };

  const removePlayer = async (playerId: string) => {
    if (!confirm("Remover este jogador da partida?")) return;

    setGameState((prev) => ({
      ...prev,
      blueTeam: prev.blueTeam.map((p) =>
        p.assignedTo === playerId ? { ...p, assignedTo: undefined } : p
      ),
      redTeam: prev.redTeam.map((p) =>
        p.assignedTo === playerId ? { ...p, assignedTo: undefined } : p
      ),
    }));

    try {
      await window.storage.delete(`user-info:${playerId}`, true);
    } catch (error) {
      console.log("Erro ao remover jogador:", error);
    }

    loadConnectedPlayers();
  };

  const saveTime = () => {
    setGameState((prev) => ({ ...prev, displayTime: tempTime }));
    setEditingTime(false);
    setTempTime("");
  };

  const handleImageUpload = async (file: File, playerId: string) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      
      if (playerId === "field") {
        setGameState((prev) => ({ ...prev, fieldImage: base64 }));
      } else {
        const [team] = playerId.split("-");
        const teamKey = team === "blue" ? "blueTeam" : "redTeam";
        
        setGameState((prev) => ({
          ...prev,
          [teamKey]: prev[teamKey].map((player) =>
            player.id === playerId ? { ...player, customImage: base64 } : player
          ),
        }));
      }
      
      setUploadingImageFor(null);
    };
    
    reader.readAsDataURL(file);
  };

  const resetPlayerImage = (playerId: string) => {
    const [team] = playerId.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";
    
    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) =>
        player.id === playerId ? { ...player, customImage: undefined } : player
      ),
    }));
  };

  const resetFieldImage = () => {
    setGameState((prev) => ({ ...prev, fieldImage: undefined }));
  };

  const getPlayerById = (id?: string) => realPlayers.find((p) => p.id === id);
  const activeRealPlayers = realPlayers.filter((p) => p.isActive);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  const currentButton = selectedPlayerButton
    ? [...gameState.blueTeam, ...gameState.redTeam].find((p) => p.id === selectedPlayerButton)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl">⚽</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Painel do Mestre</h1>
              <p className="text-gray-400 text-sm md:text-base">Controle total da partida</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToMenu}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Menu</span>
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Tela de Iniciar Partida */}
        {!gameState.gameStarted ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-gray-800 rounded-lg p-8 md:p-12 max-w-2xl w-full text-center">
              <div className="text-6xl mb-6">⚽</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Partida não iniciada
              </h2>
              <p className="text-gray-400 mb-6">
                Clique no botão abaixo para iniciar a partida. Os jogadores poderão ver o campo e você poderá gerenciar tudo.
              </p>
              
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-white font-bold mb-3 flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Jogadores Conectados ({activeRealPlayers.length})
                </h3>
                {activeRealPlayers.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
                    {activeRealPlayers.map((player) => (
                      <div key={player.id} className="bg-gray-600 rounded p-2 text-center">
                        <div className="text-2xl mb-1">{player.avatar}</div>
                        <div className="text-white text-xs truncate">{player.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Nenhum jogador conectado ainda</p>
                )}
              </div>

              <button
                onClick={startGame}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Iniciar Partida
              </button>

              <p className="text-gray-500 text-sm mt-4">
                Você poderá configurar tudo depois de iniciar
              </p>
            </div>
          </div>
        ) : (
        {/* Controles */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Placar */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" /> Placar
              </h3>
              <div className="space-y-3">
                {editingTeamNames ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={gameState.blueTeamName}
                      onChange={(e) =>
                        setGameState((prev) => ({ ...prev, blueTeamName: e.target.value }))
                      }
                      className="w-full bg-gray-600 text-blue-400 font-bold text-center rounded p-2"
                      placeholder="Nome do time azul"
                    />
                    <input
                      type="text"
                      value={gameState.redTeamName}
                      onChange={(e) =>
                        setGameState((prev) => ({ ...prev, redTeamName: e.target.value }))
                      }
                      className="w-full bg-gray-600 text-red-400 font-bold text-center rounded p-2"
                      placeholder="Nome do time vermelho"
                    />
                    <button
                      onClick={() => setEditingTeamNames(false)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                    >
                      <Check className="w-4 h-4 inline mr-1" /> Salvar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingTeamNames(true)}
                    className="w-full bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar nomes
                  </button>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <div className="text-blue-400 font-bold mb-1 text-sm">
                      {gameState.blueTeamName}
                    </div>
                    <input
                      type="number"
                      value={gameState.score.blue}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          score: { ...prev.score, blue: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="w-16 bg-gray-600 text-white text-2xl font-bold text-center rounded p-2"
                    />
                  </div>
                  <div className="text-white text-2xl font-bold px-4">X</div>
                  <div className="text-center flex-1">
                    <div className="text-red-400 font-bold mb-1 text-sm">
                      {gameState.redTeamName}
                    </div>
                    <input
                      type="number"
                      value={gameState.score.red}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          score: { ...prev.score, red: parseInt(e.target.value) || 0 },
                        }))
                      }
                      className="w-16 bg-gray-600 text-white text-2xl font-bold text-center rounded p-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tempo */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" /> Tempo de Jogo
              </h3>
              {editingTime ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={tempTime}
                    onChange={(e) => setTempTime(e.target.value)}
                    placeholder="00:00"
                    className="w-full bg-gray-600 text-white text-3xl font-bold text-center rounded p-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveTime}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    >
                      <Check className="w-4 h-4 inline" /> Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditingTime(false);
                        setTempTime("");
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
                    >
                      <X className="w-4 h-4 inline" /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-4xl font-bold text-white text-center mb-3">
                    {gameState.displayTime}
                  </div>
                  <button
                    onClick={() => {
                      setTempTime(gameState.displayTime);
                      setEditingTime(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Alterar Tempo
                  </button>
                </>
              )}
            </div>

            {/* Ações */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Ações</h3>
              <button
                onClick={() => setShowFormations(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 mb-2"
              >
                <Grid3x3 className="w-4 h-4" />
                Formações
              </button>
              <button
                onClick={loadConnectedPlayers}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 mb-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar Jogadores
              </button>
              <button
                onClick={endGame}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 mb-2"
              >
                <X className="w-4 h-4" />
                Finalizar Partida
              </button>
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

        {/* Banco de Jogadores */}
        {activeRealPlayers.length > 0 ? (
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" /> Jogadores Ativos ({activeRealPlayers.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {activeRealPlayers.map((player) => (
                <div key={player.id} className="bg-gray-700 rounded-lg p-3 relative group">
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                  <div className="text-center">
                    <div className="text-4xl mb-2">{player.avatar}</div>
                    <div className="text-white text-sm font-semibold truncate">{player.name}</div>
                    <div className="text-green-400 text-xs mt-1">● Ativo</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
            <div className="text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum jogador ativo na partida</p>
              <p className="text-sm mt-1">
                Jogadores aparecerão aqui quando clicarem em "Entrar na Partida"
              </p>
            </div>
          </div>
        )}

        {/* Campo */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold">Campo de Jogo</h3>
            <div className="flex gap-2">
              <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded cursor-pointer flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Imagem do Campo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, "field");
                  }}
                />
              </label>
              {gameState.fieldImage && (
                <button
                  onClick={resetFieldImage}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Padrão</span>
                </button>
              )}
            </div>
          </div>
          <div
            className="relative w-full rounded-lg overflow-hidden cursor-move"
            style={{
              paddingBottom: "66.67%",
              backgroundImage: gameState.fieldImage ? `url(${gameState.fieldImage})` : "none",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: gameState.fieldImage ? "transparent" : "#15803d",
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div className="absolute inset-0">
              {!gameState.fieldImage && (
                <>
                  <div className="absolute inset-0 border-4 border-white opacity-50"></div>
                  <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white opacity-50"></div>
                  <div className="absolute left-1/2 top-1/2 w-20 h-20 border-4 border-white rounded-full opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="absolute left-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>
                  <div className="absolute right-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>
                </>
              )}

              {gameState.blueTeam.map((player) => {
                const assignedPlayer = getPlayerById(player.assignedTo);
                return (
                  <div
                    key={player.id}
                    onMouseDown={() => handleMouseDown(player.id)}
                    onClick={(e) => {
                      if (e.detail === 2) {
                        setSelectedPlayerButton(player.id);
                      }
                    }}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-10 h-10 bg-blue-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg group overflow-hidden"
                  >
                    {player.customImage ? (
                      <img src={player.customImage} alt="" className="w-full h-full object-cover" />
                    ) : assignedPlayer ? (
                      <div className="text-lg">{assignedPlayer.avatar}</div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {assignedPlayer.name}
                      </div>
                    )}
                    {player.visibleTo.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[8px] flex items-center justify-center">
                        {player.visibleTo.length}
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
                    onMouseDown={() => handleMouseDown(player.id)}
                    onClick={(e) => {
                      if (e.detail === 2) {
                        setSelectedPlayerButton(player.id);
                      }
                    }}
                    style={{ left: `${player.x}%`, top: `${player.y}%` }}
                    className="absolute w-10 h-10 bg-red-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg group overflow-hidden"
                  >
                    {player.customImage ? (
                      <img src={player.customImage} alt="" className="w-full h-full object-cover" />
                    ) : assignedPlayer ? (
                      <div className="text-lg">{assignedPlayer.avatar}</div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {assignedPlayer.name}
                      </div>
                    )}
                    {player.visibleTo.length > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[8px] flex items-center justify-center">
                        {player.visibleTo.length}
                      </div>
                    )}
                  </div>
                );
              })}

              <div
                onMouseDown={() => handleMouseDown("ball")}
                style={{ left: `${gameState.ball.x}%`, top: `${gameState.ball.y}%` }}
                className="absolute w-6 h-6 bg-white rounded-full cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform shadow-xl border-2 border-gray-800"
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs">⚽</div>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            💡 Arraste jogadores e bola | Clique duplo para configurar | Verde = visível para N jogadores
          </p>
        </div>
      </div>

      {/* Modal de Formações */}
      {showFormations && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowFormations(false);
            setSelectedTeamForFormation(null);
          }}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-bold text-xl flex items-center gap-2">
                <Grid3x3 className="w-6 h-6" />
                Formações Táticas
              </h3>
              <button
                onClick={() => {
                  setShowFormations(false);
                  setSelectedTeamForFormation(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {!selectedTeamForFormation ? (
              <div className="space-y-3">
                <p className="text-gray-300 mb-4">Escolha um time para aplicar a formação:</p>
                <button
                  onClick={() => setSelectedTeamForFormation("blue")}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {gameState.blueTeamName}
                </button>
                <button
                  onClick={() => setSelectedTeamForFormation("red")}
                  className="w-full p-4 bg-red-600 hover:bg-red-700 rounded-lg text-white font-bold flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {gameState.redTeamName}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-300">
                    Aplicando formação em:{" "}
                    <span
                      className={
                        selectedTeamForFormation === "blue"
                          ? "text-blue-400 font-bold"
                          : "text-red-400 font-bold"
                      }
                    >
                      {selectedTeamForFormation === "blue"
                        ? gameState.blueTeamName
                        : gameState.redTeamName}
                    </span>
                  </p>
                  <button
                    onClick={() => setSelectedTeamForFormation(null)}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    Voltar
                  </button>
                </div>

                {Object.keys(FORMATIONS).map((formation) => (
                  <button
                    key={formation}
                    onClick={() =>
                      applyFormation(formation as keyof typeof FORMATIONS, selectedTeamForFormation)
                    }
                    className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-2">
                      <Grid3x3 className="w-5 h-5" />
                      Formação {formation}
                    </span>
                    <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Configuração */}
      {selectedPlayerButton && currentButton && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlayerButton(null)}
        >
          <div
            className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">
                Configurar Posição #{currentButton.number}
              </h3>
              <button onClick={() => setSelectedPlayerButton(null)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Upload de Imagem do Jogador */}
            <div className="mb-6 bg-gray-700 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Imagem Customizada
              </h4>
              <div className="flex gap-2">
                <label className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, selectedPlayerButton);
                    }}
                  />
                </label>
                {currentButton.customImage && (
                  <button
                    onClick={() => resetPlayerImage(selectedPlayerButton)}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resetar
                  </button>
                )}
              </div>
              {currentButton.customImage && (
                <div className="mt-3 flex justify-center">
                  <img src={currentButton.customImage} alt="Preview" className="w-20 h-20 rounded-full object-cover border-2 border-white" />
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3">Atribuir a:</h4>
              <div className="space-y-2">
                <button
                  onClick={() => assignPlayerToButton(selectedPlayerButton, null)}
                  className={`w-full p-3 rounded flex items-center gap-3 transition-colors ${
                    !currentButton.assignedTo ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <div className="text-2xl">🤖</div>
                  <div className="text-white text-left flex-1">
                    <div className="font-semibold">NPC (Número {currentButton.number})</div>
                    <div className="text-xs text-gray-300">Personagem não-jogável</div>
                  </div>
                  {!currentButton.assignedTo && <Check className="w-5 h-5 text-white" />}
                </button>
                {activeRealPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => assignPlayerToButton(selectedPlayerButton, player.id)}
                    className={`w-full p-3 rounded flex items-center gap-3 transition-colors ${
                      currentButton.assignedTo === player.id
                        ? "bg-green-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <div className="text-2xl">{player.avatar}</div>
                    <div className="text-white text-left flex-1">
                      <div className="font-semibold">{player.name}</div>
                    </div>
                    {currentButton.assignedTo === player.id && <Check className="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-3">Visível para:</h4>
              {realPlayers.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">Nenhum jogador conectado</div>
              ) : (
                <div className="space-y-2">
                  {realPlayers.map((player) => {
                    const isVisible = currentButton.visibleTo.includes(player.id);
                    return (
                      <button
                        key={player.id}
                        onClick={() => togglePlayerVisibility(selectedPlayerButton, player.id)}
                        className={`w-full p-3 rounded flex items-center gap-3 transition-colors ${
                          isVisible ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        <div className="text-2xl">{player.avatar}</div>
                        <div className="text-white text-left flex-1">
                          <div className="font-semibold">{player.name}</div>
                          <div className="text-xs text-gray-300">
                            {player.isActive ? "● Ativo" : "○ Espectador"}
                          </div>
                        </div>
                        {isVisible ? (
                          <Eye className="w-5 h-5 text-white" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}