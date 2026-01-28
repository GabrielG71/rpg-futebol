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
  // Salvar estado do jogo
  async saveGameState(gameState: any) {
    try {
      await set(ref(database, "current-game"), gameState);
      console.log("✅ Jogo salvo no Firebase");
    } catch (error) {
      console.error("❌ Erro ao salvar jogo:", error);
      throw error;
    }
  },

  // Carregar estado do jogo
  async loadGameState() {
    try {
      const snapshot = await get(ref(database, "current-game"));
      if (snapshot.exists()) {
        return snapshot.val();
      }
      return null;
    } catch (error) {
      console.error("❌ Erro ao carregar jogo:", error);
      throw error;
    }
  },

  // Listener em tempo real para o jogo
  onGameStateChange(callback: (gameState: any) => void) {
    const gameRef = ref(database, "current-game");
    onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
    return () => off(gameRef);
  },

  // Registrar presença do jogador
  async registerPlayer(userId: string, userName: string, isActive: boolean) {
    try {
      const playerRef = ref(database, `players/${userId}`);
      await set(playerRef, {
        name: userName,
        avatar: "👤",
        isActive: isActive,
        lastSeen: serverTimestamp(),
      });
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

  // Atualizar status ativo/inativo do jogador
  async updatePlayerActive(userId: string, isActive: boolean) {
    try {
      const playerRef = ref(database, `players/${userId}/isActive`);
      await set(playerRef, isActive);
    } catch (error) {
      console.error("❌ Erro ao atualizar status:", error);
      throw error;
    }
  },

  // Listener para jogadores conectados
  onPlayersChange(callback: (players: any[]) => void) {
    const playersRef = ref(database, "players");
    onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const players = Object.keys(data).map((id) => ({
          id,
          ...data[id],
        }));
        callback(players);
      } else {
        callback([]);
      }
    });
    return () => off(playersRef);
  },

  // Remover jogador
  async removePlayer(userId: string) {
    try {
      const playerRef = ref(database, `players/${userId}`);
      await remove(playerRef);
    } catch (error) {
      console.error("❌ Erro ao remover jogador:", error);
      throw error;
    }
  },

  // Limpar jogadores inativos (mais de 10 segundos sem heartbeat)
  async cleanInactivePlayers() {
    try {
      const snapshot = await get(ref(database, "players"));
      if (snapshot.exists()) {
        const players = snapshot.val();
        const now = Date.now();

        for (const [id, player] of Object.entries(players as any)) {
          if (player.lastSeen && now - player.lastSeen > 10000) {
            await remove(ref(database, `players/${id}`));
          }
        }
      }
    } catch (error) {
      console.error("❌ Erro ao limpar jogadores:", error);
    }
  },
};

export { database };
