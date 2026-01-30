// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue,
  off,
  serverTimestamp,
  DatabaseReference,
} from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase apenas uma vez
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const database = getDatabase(app);

// Storage API compatível com o código existente
export const storage = {
  async get(key: string) {
    try {
      const dbRef = ref(database, key);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        return {
          key: key,
          value: snapshot.val(),
          shared: true,
        };
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar do Firebase:", error);
      throw error;
    }
  },

  async set(key: string, value: string) {
    try {
      const dbRef = ref(database, key);
      await set(dbRef, value);

      return {
        key: key,
        value: value,
        shared: true,
      };
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
      throw error;
    }
  },

  async delete(key: string) {
    try {
      const dbRef = ref(database, key);
      await remove(dbRef);

      return {
        key: key,
        deleted: true,
        shared: true,
      };
    } catch (error) {
      console.error("Erro ao deletar do Firebase:", error);
      throw error;
    }
  },

  async list(prefix?: string) {
    try {
      const dbRef = ref(database);
      const snapshot = await get(dbRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        let keys = Object.keys(data);

        if (prefix) {
          keys = keys.filter((key) => key.startsWith(prefix));
        }

        return {
          keys: keys,
          prefix: prefix,
          shared: true,
        };
      }

      return {
        keys: [],
        prefix: prefix,
        shared: true,
      };
    } catch (error) {
      console.error("Erro ao listar do Firebase:", error);
      throw error;
    }
  },
};

// Funções específicas para o jogo
export const gameStorage = {
  // Salvar estado do jogo (ATUALIZADA)
  async saveGameState(gameState: any) {
    try {
      // DEBUG: Log completo do que está sendo salvo
      console.log("🔥 [FIREBASE-SAVE] Iniciando salvamento do jogo");
      console.log(
        "🔥 [FIREBASE-SAVE] Estado completo a ser salvo:",
        JSON.stringify(gameState, null, 2),
      );
      console.log(
        "🔥 [FIREBASE-SAVE] gameStarted value:",
        gameState.gameStarted,
      );
      console.log(
        "🔥 [FIREBASE-SAVE] gameStarted type:",
        typeof gameState.gameStarted,
      );

      // Garantir que gameStarted seja boolean
      const stateToSave = {
        ...gameState,
        gameStarted: Boolean(gameState.gameStarted),
      };

      console.log("🔥 [FIREBASE-SAVE] Estado após conversão:", {
        gameStarted: stateToSave.gameStarted,
        type: typeof stateToSave.gameStarted,
      });

      // FUNÇÃO CRÍTICA: Remover propriedades undefined/nulas que o Firebase não aceita
      const cleanGameState = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return null;
        }

        if (Array.isArray(obj)) {
          return obj.map((item) => cleanGameState(item));
        }

        if (typeof obj === "object") {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            // Só incluir se o valor não for undefined
            if (value !== undefined) {
              cleaned[key] = cleanGameState(value);
            }
          }
          return cleaned;
        }

        return obj;
      };

      const cleanedState = cleanGameState(stateToSave);

      console.log("🧹 [FIREBASE-SAVE] Estado LIMPO após remover undefined:");
      console.log(JSON.stringify(cleanedState, null, 2));

      await set(ref(database, "current-game"), cleanedState);
      console.log("✅ [FIREBASE-SAVE] Jogo salvo com SUCESSO no Firebase!");
      console.log("📁 [FIREBASE-SAVE] Caminho: current-game");

      // Retornar o estado salvo para confirmação
      return cleanedState;
    } catch (error) {
      console.error("❌ [FIREBASE-SAVE] ERRO ao salvar jogo:", error);
      // Log mais detalhado do erro
      if (error instanceof Error) {
        console.error("❌ [FIREBASE-SAVE] Mensagem de erro:", error.message);
        console.error("❌ [FIREBASE-SAVE] Stack trace:", error.stack);
      }
      throw error;
    }
  },

  // Carregar estado do jogo
  async loadGameState() {
    try {
      console.log("🔥 [FIREBASE-LOAD] Buscando jogo do Firebase...");
      const snapshot = await get(ref(database, "current-game"));

      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("✅ [FIREBASE-LOAD] Jogo ENCONTRADO no Firebase:", {
          exists: true,
          gameStarted: data.gameStarted,
          type: typeof data.gameStarted,
          hasBlueTeam: !!data.blueTeam,
          hasRedTeam: !!data.redTeam,
          blueTeamLength: data.blueTeam?.length || 0,
          redTeamLength: data.redTeam?.length || 0,
        });
        return data;
      }

      console.log(
        "⚠️ [FIREBASE-LOAD] Nenhum jogo salvo no Firebase (snapshot não existe)",
      );
      return null;
    } catch (error) {
      console.error("❌ [FIREBASE-LOAD] ERRO ao carregar jogo:", error);
      throw error;
    }
  },

  // Listener em tempo real para o jogo
  onGameStateChange(callback: (gameState: any) => void) {
    const gameRef = ref(database, "current-game");

    console.log(
      "🔔 [FIREBASE-LISTENER] Configurando listener REAL-TIME para 'current-game'",
    );

    const unsubscribe = onValue(
      gameRef,
      (snapshot) => {
        console.log(
          "📡 [FIREBASE-LISTENER] 🔥 EVENTO DISPARADO! onValue chamado",
        );

        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log("✅ [FIREBASE-LISTENER] Dados RECEBIDOS do Firebase:", {
            exists: true,
            timestamp: new Date().toISOString(),
            gameStarted: data.gameStarted,
            typeOfGameStarted: typeof data.gameStarted,
            isTrue: data.gameStarted === true,
            isBooleanTrue:
              data.gameStarted === true &&
              typeof data.gameStarted === "boolean",
            path: snapshot.ref.toString(),
          });

          // DEBUG EXTRA: Verifique a estrutura completa
          console.log("🔍 [FIREBASE-LISTENER] Estrutura completa:", {
            keys: Object.keys(data),
            blueTeamKeys: data.blueTeam
              ? Object.keys(data.blueTeam[0] || {})
              : "no blueTeam",
          });

          callback(data);
        } else {
          console.log(
            "⚠️ [FIREBASE-LISTENER] Nenhum dado no Firebase (snapshot não existe)",
          );
          callback(null);
        }
      },
      (error) => {
        console.error("❌ [FIREBASE-LISTENER] ERRO no listener:", error);
      },
    );

    return () => {
      console.log("🧹 [FIREBASE-LISTENER] Removendo listener do Firebase");
      off(gameRef);
    };
  },

  // Registrar presença do jogador (ATUALIZADA com avatar)
  async registerPlayer(
    userId: string,
    userName: string,
    isActive: boolean,
    avatar?: string,
  ) {
    try {
      const playerRef = ref(database, `players/${userId}`);
      const playerData = {
        name: userName,
        avatar: avatar || "👤",
        isActive: isActive,
        lastSeen: serverTimestamp(),
      };

      await set(playerRef, playerData);
      console.log("✅ Jogador registrado:", { userId, userName, avatar });
    } catch (error) {
      console.error("❌ Erro ao registrar jogador:", error);
      throw error;
    }
  },

  // Atualizar presença do jogador
  async updatePlayerPresence(userId: string) {
    try {
      const playerRef = ref(database, `players/${userId}/lastSeen`);
      await set(playerRef, serverTimestamp());
    } catch (error) {
      console.error("❌ Erro ao atualizar presença:", error);
    }
  },

  // Atualizar status ativo/inativo do jogador
  async updatePlayerActive(userId: string, isActive: boolean) {
    try {
      const playerRef = ref(database, `players/${userId}/isActive`);
      await set(playerRef, isActive);
      console.log(
        `✅ Status atualizado para ${userId}: ${isActive ? "Ativo" : "Inativo"}`,
      );
    } catch (error) {
      console.error("❌ Erro ao atualizar status:", error);
      throw error;
    }
  },

  // Listener para jogadores conectados
  onPlayersChange(callback: (players: any[]) => void) {
    const playersRef = ref(database, "players");

    console.log("🔔 Configurando listener para players");

    onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const players = Object.keys(data).map((id) => ({
          id,
          ...data[id],
          lastSeen: data[id].lastSeen || Date.now(),
        }));
        callback(players);
      } else {
        callback([]);
      }
    });

    return () => {
      console.log("🧹 Removendo listener do Firebase - players");
      off(playersRef);
    };
  },

  // Remover jogador
  async removePlayer(userId: string) {
    try {
      const playerRef = ref(database, `players/${userId}`);
      await remove(playerRef);
      console.log(`✅ Jogador removido: ${userId}`);
    } catch (error) {
      console.error("❌ Erro ao remover jogador:", error);
      throw error;
    }
  },

  // Limpar jogadores inativos (mais de 30 segundos sem heartbeat)
  async cleanInactivePlayers() {
    try {
      const snapshot = await get(ref(database, "players"));
      if (snapshot.exists()) {
        const players = snapshot.val();
        const now = Date.now();

        for (const [id, player] of Object.entries(players as any)) {
          if (player.lastSeen && now - player.lastSeen > 30000) {
            await remove(ref(database, `players/${id}`));
            console.log(`🧹 Jogador inativo removido: ${id}`);
          }
        }
      }
    } catch (error) {
      console.error("❌ Erro ao limpar jogadores:", error);
    }
  },

  // Atualizar nome do jogador (nova função)
  async updatePlayerName(userId: string, name: string) {
    try {
      const playerRef = ref(database, `players/${userId}/name`);
      await set(playerRef, name);
      console.log(`✅ Nome atualizado para ${userId}: ${name}`);
    } catch (error) {
      console.error("❌ Erro ao atualizar nome:", error);
      throw error;
    }
  },
};

export { database };
