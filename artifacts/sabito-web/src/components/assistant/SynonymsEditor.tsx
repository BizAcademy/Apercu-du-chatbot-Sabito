import { Plus, Trash2 } from "lucide-react";
import { ghost, hint, input } from "./styles";

export function SynonymsEditor({ value, onChange }: { value: string[][]; onChange: (v: string[][]) => void }) {
  const set = (i: number, text: string) => onChange(value.map((g, j) => (j === i ? text.split(",").map((w) => w.trimStart()) : g)));
  const clean = (i: number) => onChange(value.map((g, j) => (j === i ? g.map((w) => w.trim()).filter(Boolean) : g)));
  return (
    <div>
      <p className={hint}>Chaque groupe rapproche des termes équivalents pour la recherche classique (mots-clés, BM25, trigrammes). Séparez les termes par des virgules, 2 à 20 par groupe, 100 groupes max.</p>
      <div className="mt-3 space-y-2">
        {value.map((g, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className={input} value={g.join(", ")} onChange={(e) => set(i, e.target.value)} onBlur={() => clean(i)} placeholder="retrait, retirer, encaisser" data-testid={`input-synonyms-${i}`} />
            <span className={`shrink-0 text-[11px] ${g.filter((w) => w.trim()).length < 2 ? "text-[#b4441f]" : "text-[#8b92a8]"}`}>{g.filter((w) => w.trim()).length}</span>
            <button type="button" className="p-1.5 text-[#737b94] hover:text-[#b4441f]" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Supprimer le groupe" data-testid={`button-remove-synonyms-${i}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button type="button" className={`${ghost} mt-3`} disabled={value.length >= 100} onClick={() => onChange([...value, []])} data-testid="button-add-synonyms"><Plus size={14} />Ajouter un groupe</button>
    </div>
  );
}
