"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, Trophy, RefreshCw, LogOut } from "lucide-react";

export default function Home() {
  const { isSignedIn, user, isLoaded } = useUser();
  const router = useRouter();
  const [userRole, setUserRole] = useState<"mestre" | "jogador" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    const roleKey = `user-role:${user.id}`;
    const savedRole = localStorage.getItem(roleKey) as
      | "mestre"
      | "jogador"
      | null;

    if (savedRole) {
      setUserRole(savedRole);
      router.push(`/${savedRole}`);
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user, isLoaded, router]);

  const selectRole = (role: "mestre" | "jogador") => {
    if (!user) return;

    const roleKey = `user-role:${user.id}`;
    localStorage.setItem(roleKey, role);
    setUserRole(role);
    router.push(`/${role}`);
  };

  // Nova função para trocar papel
  const switchRole = () => {
    if (!user) return;

    const roleKey = `user-role:${user.id}`;
    localStorage.removeItem(roleKey);
    setUserRole(null);
    window.location.href = "/";
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">
          ⚽ Carregando...
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center transform hover:scale-105 transition-transform">
          <div className="text-8xl mb-6 animate-bounce">⚽</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            RPG de Futebol
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Entre para começar sua partida épica!
          </p>
          <SignInButton mode="modal">
            <button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl">
              Entrar / Cadastrar
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full text-center">
          <div className="text-8xl mb-6">⚽</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Papel atual:{" "}
            <span className="text-green-600">
              {userRole === "mestre" ? "Mestre" : "Jogador"}
            </span>
          </h1>
          <p className="text-gray-600 mb-8">
            Você já está como {userRole === "mestre" ? "mestre" : "jogador"}.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => router.push(`/${userRole}`)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              Continuar como {userRole === "mestre" ? "Mestre" : "Jogador"}
            </button>

            <button
              onClick={switchRole}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-gray-700 hover:to-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Trocar de Papel
            </button>

            <button
              onClick={() => {
                localStorage.removeItem(`user-role:${user.id}`);
                window.location.href = "/";
              }}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Sair e Escolher Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-700 to-emerald-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-8">
          <div className="text-6xl">⚽</div>
          <UserButton afterSignOutUrl="/" />
        </div>

        <h1 className="text-4xl font-bold text-gray-800 mb-3 text-center">
          Bem-vindo, {user.firstName || "Jogador"}!
        </h1>
        <p className="text-gray-600 mb-10 text-center text-lg">
          Escolha seu papel na partida:
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => selectRole("mestre")}
            className="group bg-gradient-to-br from-blue-500 to-blue-700 p-8 rounded-2xl text-white hover:from-blue-600 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-2xl"
          >
            <Trophy className="w-16 h-16 mx-auto mb-4 group-hover:rotate-12 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Mestre</h2>
            <p className="text-blue-100 text-sm">
              Controle o campo, o tempo e narre a história
            </p>
          </button>

          <button
            onClick={() => selectRole("jogador")}
            className="group bg-gradient-to-br from-red-500 to-red-700 p-8 rounded-2xl text-white hover:from-red-600 hover:to-red-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-2xl"
          >
            <Users className="w-16 h-16 mx-auto mb-4 group-hover:rotate-12 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Jogador</h2>
            <p className="text-red-100 text-sm">
              Visualize o campo e participe da partida
            </p>
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            Pode trocar de papel a qualquer momento
          </p>
        </div>
      </div>
    </div>
  );
}
