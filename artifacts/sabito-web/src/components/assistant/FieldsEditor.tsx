import type { IntentField } from "@workspace/api-client-react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ghost, hint, input } from "./styles";

const TYPES: { v: IntentField["type"]; l: string }[] = [{ v: "text", l: "Texte" }, { v: "identifier", l: "Identifiant" }, { v: "country", l: "Pays" }];

export function FieldsEditor({ value, onChange, prefix }: { value: IntentField[]; onChange: (v: IntentField[]) => void; prefix: string }) {
  const upd = (i: number, p: Partial<IntentField>) => onChange(value.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const move = (i: number, d: number) => { const n = [...value]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div>
      <p className={hint}>Informations demandées dans l'ordre, avant l'appel serveur. Aucun champ est valide (l'identité vérifiée suffit). 15 max.</p>
      <div className="mt-2 space-y-2">
        {value.map((f, i) => (
          <div key={i} className="rounded-xl border border-[#eceefa] bg-[#fafbff] p-3" data-testid={`row-field-${prefix}-${i}`}>
            <div className="grid gap-2 sm:grid-cols-[1fr_130px_80px_80px_auto]">
              <input className={`${input} font-mono`} placeholder="nom_du_champ" value={f.name} onChange={(e) => upd(i, { name: e.target.value })} data-testid={`input-field-name-${prefix}-${i}`} />
              <select className={input} value={f.type} onChange={(e) => upd(i, { type: e.target.value as IntentField["type"] })} data-testid={`select-field-type-${prefix}-${i}`}>
                {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
              <input type="number" min={1} max={500} className={input} title="Longueur min" value={f.min_length} onChange={(e) => upd(i, { min_length: Number(e.target.value) })} data-testid={`input-field-min-${prefix}-${i}`} />
              <input type="number" min={1} max={500} className={input} title="Longueur max" value={f.max_length} onChange={(e) => upd(i, { max_length: Number(e.target.value) })} data-testid={`input-field-max-${prefix}-${i}`} />
              <div className="flex items-center">
                <button type="button" disabled={i === 0} className="p-1.5 text-[#737b94] disabled:opacity-30" onClick={() => move(i, -1)} aria-label="Monter" data-testid={`button-field-up-${prefix}-${i}`}><ArrowUp size={14} /></button>
                <button type="button" disabled={i === value.length - 1} className="p-1.5 text-[#737b94] disabled:opacity-30" onClick={() => move(i, 1)} aria-label="Descendre" data-testid={`button-field-down-${prefix}-${i}`}><ArrowDown size={14} /></button>
                <button type="button" className="p-1.5 text-[#737b94] hover:text-[#b4441f]" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Retirer" data-testid={`button-field-remove-${prefix}-${i}`}><Trash2 size={14} /></button>
              </div>
            </div>
            <input className={`${input} mt-2`} placeholder="Question posée à l'utilisateur" value={f.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} data-testid={`input-field-prompt-${prefix}-${i}`} />
          </div>
        ))}
      </div>
      <button type="button" className={`${ghost} mt-2`} disabled={value.length >= 15} onClick={() => onChange([...value, { name: "", prompt: "", type: "text", min_length: 1, max_length: 100 }])} data-testid={`button-add-field-${prefix}`}><Plus size={14} />Ajouter un champ</button>
    </div>
  );
}
