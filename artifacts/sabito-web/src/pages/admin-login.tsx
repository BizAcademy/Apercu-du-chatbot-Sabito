import { useState, type FormEvent } from "react";
import type { CoreStatus } from "@workspace/api-client-react";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useAdmin } from "@/lib/admin";

export function AdminLogin({ status, statusError, retry }: { status?: CoreStatus; statusError?: string; retry: () => void }) {
  const { login } = useAdmin();
  const [key, setKey] = useState("");
  const configured = status?.configured === true;
  const submit = (e: FormEvent) => { e.preventDefault(); if (configured && key.trim()) login(key.trim()); setKey(""); };
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f1f3ff] p-4 font-['Outfit',sans-serif] text-[#11162b]">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[26px] border border-[#e0e4fb] bg-white shadow-[0_24px_80px_rgba(48,59,153,0.12)]">
        <div className="relative overflow-hidden bg-[#171d53] px-7 py-7 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[15px] bg-gradient-to-br from-[#7881ff] to-[#4855f6] text-[19px] font-extrabold">S</div>
            <div><div className="text-[19px] font-bold">sabito</div><div className="text-[10px] tracking-[1.5px] text-[#aeb5e8]">CONSOLE D'ADMINISTRATION</div></div>
          </div>
          <p className="mt-5 text-[13px] leading-6 text-[#c0c6eb]">Gère les plateformes, leurs identifiants et les références validées que Sabito utilise pour répondre.</p>
        </div>
        <div className="p-7">
          {!status && !statusError && <div className="h-24 animate-pulse rounded-xl bg-[#f1f3ff]" data-testid="status-loading" />}
          {statusError && (
            <div role="alert" className="rounded-xl border border-[#f3d2d2] bg-[#fff6f6] p-4 text-[13px] text-[#9b2c2c]">
              Statut du serveur indisponible : {statusError}
              <button className="ml-2 font-semibold underline" onClick={retry} data-testid="button-retry-status">Réessayer</button>
            </div>
          )}
          {status && !configured && (
            <div className="rounded-xl border border-[#f2e2b8] bg-[#fffaf0] p-4 text-[13px] leading-6 text-[#7a5a12]" data-testid="status-setup">
              <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldAlert size={16} /> Configuration requise</div>
              Le serveur Sabito n'est pas encore configuré. Secrets manquants dans l'espace de travail :
              <ul className="mt-2 list-disc pl-5 font-mono text-[12px]">{status.missingSecrets.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="mt-2">La connexion sera possible une fois ces secrets ajoutés et le serveur redémarré.</p>
            </div>
          )}
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block text-[12px] font-semibold text-[#4a5270]" htmlFor="admin-key">Clé administrateur (ADMIN_API_KEY)</label>
            <div className="flex items-center gap-2 rounded-[13px] border border-[#dfe2ef] px-3 focus-within:border-[#9da5ff]">
              <KeyRound size={15} className="text-[#9299ac]" />
              <input id="admin-key" type="password" autoComplete="off" disabled={!configured} value={key} onChange={(e) => setKey(e.target.value)} className="h-11 w-full bg-transparent text-[13px] outline-none disabled:cursor-not-allowed" data-testid="input-admin-key" />
            </div>
            <button disabled={!configured || !key.trim()} className="h-11 w-full rounded-[13px] bg-[#3641f5] text-[13px] font-semibold text-white transition hover:bg-[#2934dc] disabled:bg-[#c8cbea]" data-testid="button-login">Ouvrir la console</button>
            <p className="text-[11px] text-[#8b92a8]">La clé reste uniquement en mémoire dans cet onglet ; elle est effacée à la déconnexion ou au rechargement.</p>
          </form>
          {status && <p className="mt-4 text-[11px] text-[#8b92a8]">Moteur : <span className="font-mono">{status.engine}</span></p>}
        </div>
      </div>
    </main>
  );
}
