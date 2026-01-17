"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Users,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  X,
  Check,
} from "lucide-react";

interface Player {
  id: string;
  x: number;
  y: number;
  number: number;
  assignedTo?: string; // ID do jogador real
  visibleTo: string[]; // IDs dos jogadores que podem ver
}

interface RealPlayer {
  id: string;
  name: string;
  avatar: string;
}

export default function MestrePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedPlayerButton, setSelectedPlayerButton] = useState<
    string | null
  >(null);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [editingTeamNames, setEditingTeamNames] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [tempTime, setTempTime] = useState("00:00");

  // Jogadores reais conectados (simulação - depois vai vir do banco)
  const [realPlayers, setRealPlayers] = useState<RealPlayer[]>([
    { id: "p1", name: "João Silva", avatar: "👤" },
    { id: "p2", name: "Maria Costa", avatar: "👩" },
    { id: "p3", name: "Pedro Santos", avatar: "👨" },
    { id: "p4", name: "Ana Lima", avatar: "👧" },
  ]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey);

    if (savedRole !== "mestre") {
      router.push("/");
      return;
    }

    // Carregar jogo salvo se existir
    const savedGame = localStorage.getItem("current-game");
    if (savedGame) {
      setGameState(JSON.parse(savedGame));
    }

    setLoading(false);
  }, [user, isLoaded, router]);

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
      })),
    redTeam: Array(11)
      .fill(null)
      .map((_, i) => ({
        id: `red-${i}`,
        x: 65 + (i % 4) * 10,
        y: 20 + Math.floor(i / 4) * 20,
        number: i + 1,
        visibleTo: [] as string[],
      })),
    ball: { x: 50, y: 50 },
    displayTime: "00:00",
    score: { blue: 0, red: 0 },
  });

  const [dragging, setDragging] = useState<string | null>(null);

  // Salvar estado do jogo automaticamente
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

    const [team] = dragging.split("-");
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

  const resetGame = () => {
    if (!confirm("Tem certeza que deseja resetar todo o jogo?")) return;

    setGameState({
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
        })),
      redTeam: Array(11)
        .fill(null)
        .map((_, i) => ({
          id: `red-${i}`,
          x: 65 + (i % 4) * 10,
          y: 20 + Math.floor(i / 4) * 20,
          number: i + 1,
          visibleTo: [] as string[],
        })),
      ball: { x: 50, y: 50 },
      displayTime: "00:00",
      score: { blue: 0, red: 0 },
    });
  };

  const assignPlayerToButton = (buttonId: string, playerId: string | null) => {
    const [team] = buttonId.split("-");
    const teamKey = team === "blue" ? "blueTeam" : "redTeam";

    setGameState((prev) => ({
      ...prev,
      [teamKey]: prev[teamKey].map((player) =>
        player.id === buttonId
          ? { ...player, assignedTo: playerId || undefined }
          : player,
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

  const saveTime = () => {
    setGameState((prev) => ({ ...prev, displayTime: tempTime }));
    setEditingTime(false);
  };

  const getPlayerById = (id?: string) => realPlayers.find((p) => p.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">⚽ Carregando...</div>
      </div>
    );
  }

  const currentButton = selectedPlayerButton
    ? [...gameState.blueTeam, ...gameState.redTeam].find(
        (p) => p.id === selectedPlayerButton,
      )
    : null;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="text-3xl md:text-4xl">⚽</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Painel do Mestre
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                Controle total da partida
              </p>
            </div>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Controles */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Placar */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" /> Placar
              </h3>
              <div className="space-y-3">
                {/* Nomes dos times */}
                {editingTeamNames ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={gameState.blueTeamName}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          blueTeamName: e.target.value,
                        }))
                      }
                      className="w-full bg-gray-600 text-blue-400 font-bold text-center rounded p-2"
                      placeholder="Nome do time azul"
                    />
                    <input
                      type="text"
                      value={gameState.redTeamName}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          redTeamName: e.target.value,
                        }))
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
                          score: {
                            ...prev.score,
                            blue: parseInt(e.target.value) || 0,
                          },
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
                      onClick={() => setEditingTime(false)}
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
        <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" /> Jogadores Conectados
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {realPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-gray-700 rounded-lg p-3 text-center"
              >
                <div className="text-4xl mb-2">{player.avatar}</div>
                <div className="text-white text-sm font-semibold truncate">
                  {player.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campo */}
        <div className="bg-gray-800 rounded-lg p-4 md:p-6">
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

              {/* Gols */}
              <div className="absolute left-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>
              <div className="absolute right-0 top-1/2 w-2 h-24 bg-white opacity-70 -translate-y-1/2"></div>

              {/* Jogadores Time Azul */}
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
                    className="absolute w-10 h-10 bg-blue-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg group"
                  >
                    {assignedPlayer ? (
                      <div className="text-lg">{assignedPlayer.avatar}</div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {assignedPlayer.name}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Jogadores Time Vermelho */}
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
                    className="absolute w-10 h-10 bg-red-500 border-2 border-white rounded-full flex flex-col items-center justify-center text-white font-bold text-xs cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform shadow-lg group"
                  >
                    {assignedPlayer ? (
                      <div className="text-lg">{assignedPlayer.avatar}</div>
                    ) : (
                      <div>{player.number}</div>
                    )}
                    {assignedPlayer && (
                      <div className="absolute -bottom-6 text-[8px] bg-gray-900 px-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {assignedPlayer.name}
                      </div>
                    )}
                  </div>
                );
              })}

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
            💡 Arraste jogadores e bola | Clique duplo em um jogador para
            atribuir/configurar
          </p>
        </div>
      </div>

      {/* Modal de Atribuição/Visibilidade */}
      {selectedPlayerButton && currentButton && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">
                Configurar Jogador #{currentButton.number}
              </h3>
              <button
                onClick={() => setSelectedPlayerButton(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Atribuir jogador */}
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3">
                Atribuir a um jogador:
              </h4>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    assignPlayerToButton(selectedPlayerButton, null)
                  }
                  className={`w-full p-3 rounded flex items-center gap-3 ${
                    !currentButton.assignedTo
                      ? "bg-green-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  <div className="text-2xl">❌</div>
                  <div className="text-white text-left">
                    <div className="font-semibold">
                      Nenhum (Número {currentButton.number})
                    </div>
                  </div>
                </button>
                {realPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() =>
                      assignPlayerToButton(selectedPlayerButton, player.id)
                    }
                    className={`w-full p-3 rounded flex items-center gap-3 ${
                      currentButton.assignedTo === player.id
                        ? "bg-green-600"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <div className="text-2xl">{player.avatar}</div>
                    <div className="text-white text-left">
                      <div className="font-semibold">{player.name}</div>
                    </div>
                    {currentButton.assignedTo === player.id && (
                      <Check className="w-5 h-5 text-white ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Controle de visibilidade */}
            <div>
              <h4 className="text-white font-semibold mb-3">Visível para:</h4>
              <div className="space-y-2">
                {realPlayers.map((player) => {
                  const isVisible = currentButton.visibleTo.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() =>
                        togglePlayerVisibility(selectedPlayerButton, player.id)
                      }
                      className={`w-full p-3 rounded flex items-center gap-3 ${
                        isVisible ? "bg-green-600" : "bg-gray-700"
                      } hover:opacity-80`}
                    >
                      <div className="text-2xl">{player.avatar}</div>
                      <div className="text-white text-left flex-1">
                        <div className="font-semibold">{player.name}</div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
