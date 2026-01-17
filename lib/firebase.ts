// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  query,
  orderByKey,
  startAt,
  endAt,
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

// Funções auxiliares para simular a API do window.storage
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

export { database };
