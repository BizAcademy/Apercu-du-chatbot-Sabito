import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

type AdminCtx = {
  adminKey: string | null;
  login: (key: string) => void;
  logout: () => void;
  headers: () => { headers: Record<string, string> };
  onLogout: (fn: () => void) => () => void;
};
const Ctx = createContext<AdminCtx | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const qc = useQueryClient();
  const listeners = useRef(new Set<() => void>());
  const logout = useCallback(() => {
    listeners.current.forEach((fn) => fn());
    setAdminKey(null);
    qc.removeQueries({ queryKey: ["sabito-admin"] });
  }, [qc]);
  const value: AdminCtx = {
    adminKey,
    login: (k) => setAdminKey(k),
    logout,
    headers: () => ({ headers: { "X-Admin-Key": adminKey ?? "" } }),
    onLogout: (fn) => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("AdminProvider manquant");
  return c;
}
export function errMsg(e: unknown) {
  if (e && typeof e === "object") {
    const anyE = e as { status?: number; message?: string; data?: { message?: string; error?: { message?: string } | string } };
    const d = anyE.data?.error;
    const m = typeof d === "string" ? d : d?.message;
    if (anyE.status === 401 || anyE.status === 403) return "Clé administrateur refusée ou expirée.";
    return m || anyE.data?.message || anyE.message || "Erreur inconnue";
  }
  return String(e);
}
