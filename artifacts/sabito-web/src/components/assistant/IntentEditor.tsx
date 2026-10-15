import { useState } from "react";
import type { IntentDefinition } from "@workspace/api-client-react";
import { ChevronDown, ChevronRight, Trash2, TriangleAlert } from "lucide-react";
import { FieldsEditor } from "./FieldsEditor";
import { KNOWN_FUNCTIONS, validateIntent } from "./validate";
import { ghost, hint, input, label } from "./styles";

const RESP: { k: keyof IntentDefinition["responses"]; l: string }[] = [
  { k: "success", l: "Succès" }, { k: "pending", l: "En attente" }, { k: "not_found", l: "Introuvable" }, { k: "error", l: "Erreur" },
];

export function IntentEditor({ intent, all, onChange, onDelete }: { intent: IntentDefinition; all: IntentDefinition[]; onChange: (v: IntentDefinition) => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const errors = validateIntent(intent, all);
  const p = intent.id;
  const set = (patch: Partial<IntentDefinition>) => onChange({ ...intent, ...patch });
  const custom = intent.backend_function && !KNOWN_FUNCTIONS.includes(intent.backend_function);
  return (
    <div className="rounded-[16px] border border-[#e8eaff]" data-testid={`card-intent-${p}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(!open)} data-testid={`button-toggle-intent-${p}`}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="truncate text-[13px] font-semibold">{intent.name || "Sans nom"}</span>
          <span className="font-mono text-[11px] text-[#8b92a8]">{intent.id}</span>
          {errors.length > 0 && <span className="rounded-full bg-[#fff1ec] px-2 py-0.5 text-[10px] font-semibold text-[#b4441f]">{errors.length} à corriger</span>}
        </button>
        <label className="flex items-center gap-2 text-[11px] text-[#6c748d]">
          <input type="checkbox" checked={intent.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="accent-[#3641f5]" data-testid={`switch-intent-${p}`} />
          {intent.enabled ? "Active" : "Désactivée"}
        </label>
        <button type="button" className="p-1.5 text-[#737b94] hover:text-[#b4441f]" onClick={() => setConfirm(true)} aria-label="Supprimer" data-testid={`button-delete-intent-${p}`}><Trash2 size={14} /></button>
      </div>
      {confirm && (
        <div className="mx-4 mb-3 rounded-xl border border-[#f2e2b8] bg-[#fffaf0] p-3 text-[12px] text-[#7a5a12]">
          <div className="flex items-center gap-2 font-semibold"><TriangleAlert size={14} />Supprimer « {intent.name} » ?</div>
          <p className="mt-1">L'intention sera retirée du brouillon, puis définitivement supprimée à l'enregistrement. La fonction serveur de la plateforme n'est pas affectée.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="rounded-[10px] bg-[#b4441f] px-3 py-1.5 font-semibold text-white" onClick={onDelete} data-testid={`button-confirm-delete-intent-${p}`}>Supprimer</button>
            <button type="button" className={ghost} onClick={() => setConfirm(false)}>Annuler</button>
          </div>
        </div>
      )}
      {open && (
        <div className="space-y-4 border-t border-[#eef0fa] px-4 py-4">
          {errors.length > 0 && <ul className="list-disc rounded-xl bg-[#fff6f6] py-2 pl-7 pr-3 text-[11px] text-[#9b2c2c]" data-testid={`text-intent-errors-${p}`}>{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label}>Nom</label><input className={`${input} mt-1`} value={intent.name} onChange={(e) => set({ name: e.target.value })} data-testid={`input-intent-name-${p}`} /></div>
            <div><label className={label}>Identifiant stable</label><input className={`${input} mt-1 font-mono`} value={intent.id} onChange={(e) => set({ id: e.target.value })} data-testid={`input-intent-id-${p}`} /><p className={hint}>snake_case unique. Évitez de le changer une fois en production.</p></div>
          </div>
          <div>
            <label className={label}>Questions déclencheuses (une par ligne, 1 à 30)</label>
            <textarea className={`${input} mt-1 min-h-[90px]`} value={intent.triggers.join("\n")} onChange={(e) => set({ triggers: e.target.value.split("\n") })} onBlur={() => set({ triggers: intent.triggers.map((t) => t.trim()).filter(Boolean) })} data-testid={`input-intent-triggers-${p}`} />
          </div>
          <div>
            <label className={label}>Champs à collecter</label>
            <FieldsEditor prefix={p} value={intent.fields} onChange={(fields) => set({ fields })} />
          </div>
          <div>
            <label className={label}>Fonction serveur de la plateforme</label>
            <input className={`${input} mt-1 font-mono`} list="known-backend-functions" placeholder="deposit_status" value={intent.backend_function} onChange={(e) => set({ backend_function: e.target.value.trim() })} data-testid={`input-intent-function-${p}`} />
            <datalist id="known-backend-functions">{KNOWN_FUNCTIONS.map((f) => <option key={f} value={f} />)}</datalist>
            <p className={hint}>Nom d'un gestionnaire en lecture seule déjà enregistré par le connecteur de la plateforme (ex. account_activation, deposit_status, referral_code). Ce n'est ni une URL ni du code. Créer une intention ne demande aucune modification de Sabito, mais ne crée pas la fonction métier : elle doit exister côté plateforme.</p>
            {custom && <p className="mt-1 rounded-lg bg-[#fffaf0] px-2 py-1 text-[11px] text-[#7a5a12]" data-testid={`text-intent-custom-function-${p}`}>« {intent.backend_function} » n'est pas une fonction par défaut : vérifiez que le connecteur de la plateforme l'a bien enregistrée, sinon un ticket de support sera créé.</p>}
          </div>
          <div>
            <label className={label}>Message pour visiteur non vérifié</label>
            <textarea className={`${input} mt-1 min-h-[60px]`} maxLength={4000} value={intent.guest_message} onChange={(e) => set({ guest_message: e.target.value })} data-testid={`input-intent-guest-${p}`} />
          </div>
          <div>
            <div className={label}>Réponses selon le résultat du serveur</div>
            <p className={hint}>Seules les valeurs transmises par le serveur sont interpolées, par ex. {"{code_parrain}"}, {"{statut}"}, {"{nom_utilisateur}"}. Aucun code n'est évalué. Si une variable est absente ou inconnue, Sabito n'invente rien et crée un ticket de support.</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {RESP.map((r) => (
                <div key={r.k}><span className="text-[11px] font-semibold text-[#6c748d]">{r.l}</span>
                  <textarea className={`${input} mt-1 min-h-[70px]`} maxLength={4000} value={intent.responses[r.k]} onChange={(e) => set({ responses: { ...intent.responses, [r.k]: e.target.value } })} data-testid={`input-intent-response-${r.k}-${p}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
