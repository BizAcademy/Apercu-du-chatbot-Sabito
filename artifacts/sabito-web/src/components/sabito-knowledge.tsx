import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { KnowledgeEntry } from "@workspace/api-client-react";

export type CorrectionDraft = { question: string; answer: string; messageIndex?: number };

export function CorrectionDialog({ draft, close, save, saving, error }: {
  draft: CorrectionDraft | null; close: () => void;
  save: (question: string, answer: string, index?: number) => Promise<boolean>;
  saving: boolean; error: string;
}) {
  const [answer, setAnswer] = useState(draft?.answer ?? "");
  return (
    <Dialog open={!!draft} onOpenChange={open => { if (!open && !saving) close(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white font-['Outfit',sans-serif]">
        <DialogHeader>
          <DialogTitle>Corriger et valider la réponse</DialogTitle>
          <DialogDescription>Cette référence sera utilisée pour les prochaines réponses dans ton espace de test BCA. Une correction pour la même question remplace la précédente.</DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-[#f1f3ff] p-3 text-sm">{draft?.question}</p>
        <form onSubmit={async e => { e.preventDefault(); if (draft && await save(draft.question, answer.trim(), draft.messageIndex)) close(); }}>
          <label htmlFor="approved-answer" className="mb-2 block text-sm font-semibold">Réponse validée</label>
          <textarea id="approved-answer" autoFocus rows={9} maxLength={4000} value={answer} onChange={e => setAnswer(e.target.value)} className="w-full rounded-xl border border-[#c9ceed] p-3 text-sm outline-none focus:border-[#3641f5]" />
          <p className="mt-1 text-xs text-slate-500">{answer.length}/4 000 caractères · N’inclus aucune donnée personnelle ni clé secrète.</p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" disabled={saving} onClick={close} className="rounded-xl border px-4 py-2 text-sm">Annuler</button>
            <button disabled={saving || !answer.trim() || answer.length > 4000} className="rounded-xl bg-[#3641f5] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer comme référence"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeDialog({ open, close, entries, edit, remove, saving, error }: {
  open: boolean; close: () => void; entries: KnowledgeEntry[];
  edit: (entry: KnowledgeEntry) => void; remove: (id: number) => Promise<boolean>;
  saving: boolean; error: string;
}) {
  const [confirmId, setConfirmId] = useState<number | null>(null);
  return (
    <Dialog open={open} onOpenChange={open => { if (!open) close(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white font-['Outfit',sans-serif] sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Corrections validées · BCA</DialogTitle>
          <DialogDescription>Enregistrées sur le serveur pour cet espace de test, identifié par ce navigateur. Non partagées avec les membres BCA. Elles ne modifient pas le modèle IA.</DialogDescription>
        </DialogHeader>
        {!entries.length && <p className="py-5 text-sm text-slate-600">Aucune référence. Pose une question, puis utilise « Corriger la réponse ».</p>}
        {entries.map(entry => (
          <article key={entry.id} className="rounded-xl border border-[#e0e4fb] p-4">
            <h3 className="text-sm font-semibold">{entry.question}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{entry.answer}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <button disabled={saving} className="text-[#3641f5]" onClick={() => edit(entry)}>Modifier</button>
              {confirmId === entry.id ? <>
                <span>Ne plus utiliser cette référence ?</span>
                <button disabled={saving} className="text-red-700" onClick={async () => { if (await remove(entry.id)) setConfirmId(null); }}>Confirmer la suppression</button>
                <button onClick={() => setConfirmId(null)}>Annuler</button>
              </> : <button disabled={saving} className="text-red-700" onClick={() => setConfirmId(entry.id)}>Supprimer</button>}
            </div>
          </article>
        ))}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
