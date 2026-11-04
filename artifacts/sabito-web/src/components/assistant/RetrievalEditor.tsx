import { useEffect, useRef, useState } from "react";
import type { RetrievalSettings } from "@workspace/api-client-react";
import { Plus, Search, Trash2 } from "lucide-react";
import { ghost, hint, input, label } from "./styles";

type Dict = Record<string, string>;
type Row = { k: string; v: string };
type Kind = "abbreviations" | "corrections";

const MAX = 200;
const KEY_RE = /^[a-z]{2,32}$/;
const VALUE_RE = /^[a-zà-öø-ÿœæ]+(?:[ '\u2019]+[a-zà-öø-ÿœæ]+)*$/i;
// Keys refused by the backend for corrections; the interface protects more words below.
const BACKEND_PROTECTED = ["pas", "non", "jamais", "sans", "aucun", "aucune", "annule", "annulee", "debite", "debitee", "rembourse", "remboursee"];
const PROTECTED = new Set([...BACKEND_PROTECTED, "debit", "débité", "débitée", "debitée",
  "ne", "pas", "non", "jamais", "aucun", "aucune", "rien", "plus", "ni", "nul", "nulle", "sans", "personne", "oui", "si",
  "valide", "validee", "validé", "validée", "refuse", "refusé", "refusee", "refusée", "rejete", "rejeté", "rejetee", "rejetée",
  "approuve", "approuvé", "approuvee", "approuvée", "attente", "pending", "annule", "annulé", "annulee", "annulée", "echoue", "échoué",
  "echec", "échec", "reussi", "réussi", "confirme", "confirmé", "confirmee", "confirmée", "recu", "reçu", "envoye", "envoyé", "bloque", "bloqué",
  "suspendu", "actif", "inactif", "rembourse", "remboursé", "traite", "traité", "termine", "terminé", "ouvert", "ferme", "fermé", "success", "failed",
  "zero", "zéro", "un", "une", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze",
  "quinze", "seize", "vingt", "trente", "quarante", "cinquante", "soixante", "cent", "cents", "mille", "million", "millions", "milliard",
  "premier", "premiere", "première", "second", "seconde", "dernier", "derniere", "dernière",
  "ref", "reference", "référence", "numero", "numéro", "id", "identifiant", "code", "transaction", "commande", "ticket", "facture",
]);

const words = (s: string) => s.toLowerCase().split(/[\s'\u2019]+/).filter(Boolean);
const toRows = (d: Dict | undefined): Row[] => Object.entries(d ?? {}).map(([k, v]) => ({ k, v }));

function rowError(r: Row, kind: Kind, dupes: Set<string>): string | null {
  const k = r.k.trim(), v = r.v.trim();
  if (!k && !v) return "Ligne vide : supprimez-la ou complétez-la.";
  if (!KEY_RE.test(k)) return "Clé : 2 à 32 lettres minuscules a-z, sans accent, chiffre ni espace.";
  if (dupes.has(k)) return "Clé en double.";
  if (v.length < 2 || v.length > 100) return "Valeur : 2 à 100 caractères.";
  if (/\d/.test(v)) return "Valeur : aucun chiffre, montant ni référence.";
  if (!VALUE_RE.test(v)) return "Valeur : lettres, espaces et apostrophes uniquement (pas de tiret).";
  if (kind === "corrections") {
    const hit = [k, ...words(v)].find((w) => PROTECTED.has(w));
    if (hit) return `« ${hit} » est protégé : négations, statuts, nombres et références ne peuvent pas être corrigés.`;
    if (k === v.toLowerCase()) return "La correction est identique au mot d'origine.";
  }
  return null;
}

function analyse(rows: Row[], kind: Kind) {
  const seen = new Set<string>(), dupes = new Set<string>();
  rows.forEach((r) => { const k = r.k.trim(); if (seen.has(k)) dupes.add(k); seen.add(k); });
  const errors = rows.map((r) => rowError(r, kind, dupes));
  const tooMany = rows.length > MAX;
  const valid = !tooMany && errors.every((e) => e === null);
  const dict: Dict = {};
  if (valid) rows.forEach((r) => { dict[r.k.trim()] = r.v.trim(); });
  return { errors, valid, dict, tooMany };
}

function DictEditor({ kind, value, onChange, onValid }: { kind: Kind; value: Dict; onChange: (d: Dict) => void; onValid: (v: boolean) => void }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value));
  const [filter, setFilter] = useState("");
  const emitted = useRef(JSON.stringify(value ?? {}));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Resynchronise only when the parent value changes from outside (reload, discard).
  useEffect(() => {
    const s = JSON.stringify(value ?? {});
    if (s !== emitted.current) { emitted.current = s; setRows(toRows(value)); }
  }, [value]);

  const { errors, valid, tooMany } = analyse(rows, kind);
  const onValidRef = useRef(onValid);
  onValidRef.current = onValid;
  useEffect(() => { onValidRef.current(valid); }, [valid]);
  const update = (next: Row[]) => {
    setRows(next);
    const a = analyse(next, kind);
    if (a.valid) {
      const s = JSON.stringify(a.dict);
      if (s !== emitted.current) { emitted.current = s; onChangeRef.current(a.dict); }
    }
  };
  const f = filter.trim().toLowerCase();
  const visible = rows.map((r, i) => ({ r, i })).filter(({ r }) => !f || r.k.toLowerCase().includes(f) || r.v.toLowerCase().includes(f));
  const isAbbr = kind === "abbreviations";

  return (
    <div className="rounded-xl bg-[#f6f7ff] p-3" data-testid={`dict-${kind}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={label}>{isAbbr ? "Abréviations" : "Corrections orthographiques"} <span className="ml-1 font-mono text-[11px] text-[#5b63a8]" data-testid={`text-${kind}-count`}>{rows.length} / {MAX}</span></div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Filtrer</span>
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b92a8]" />
            <input className="w-[170px] rounded-[10px] border border-[#dfe2ef] bg-white py-1.5 pl-7 pr-2 text-[12px] outline-none focus:border-[#9da5ff]" placeholder="Filtrer" value={filter} onChange={(e) => setFilter(e.target.value)} data-testid={`input-filter-${kind}`} />
          </label>
          <button type="button" className={ghost} disabled={rows.length >= MAX} onClick={() => { setFilter(""); update([...rows, { k: "", v: "" }]); }} data-testid={`button-add-${kind}`}><Plus size={13} />Ajouter</button>
        </div>
      </div>
      <p className={hint}>{isAbbr
        ? "Forme courte tapée par les membres et son développement, par exemple « mdp » vers « mot de passe »."
        : "Faute fréquente et son orthographe correcte. Les négations, statuts, nombres et références ne sont jamais corrigés, pour ne pas changer le sens d'une question."}</p>
      {rows.length === 0 && <p className="mt-2 rounded-lg bg-white p-3 text-[12px] text-[#6c748d]">Aucune entrée. Cliquez sur « Ajouter » pour en créer une.</p>}
      {rows.length > 0 && visible.length === 0 && <p className="mt-2 text-[12px] text-[#6c748d]">Aucune entrée ne correspond au filtre.</p>}
      <div className="mt-2 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
        {visible.map(({ r, i }) => (
          <div key={i} data-testid={`row-${kind}-${i}`}>
            <div className="flex items-center gap-2">
              <input aria-label="Clé" className={`${input} !py-1.5 font-mono ${errors[i] ? "!border-[#e8b4b4]" : ""}`} value={r.k} placeholder={isAbbr ? "mdp" : "retarit"} maxLength={40} onChange={(e) => update(rows.map((x, j) => j === i ? { ...x, k: e.target.value } : x))} data-testid={`input-${kind}-key-${i}`} />
              <span className="text-[12px] text-[#8b92a8]">vers</span>
              <input aria-label="Valeur" className={`${input} !py-1.5 ${errors[i] ? "!border-[#e8b4b4]" : ""}`} value={r.v} placeholder={isAbbr ? "mot de passe" : "retrait"} maxLength={100} onChange={(e) => update(rows.map((x, j) => j === i ? { ...x, v: e.target.value } : x))} data-testid={`input-${kind}-value-${i}`} />
              <button type="button" aria-label="Supprimer l'entrée" className="rounded-[10px] p-2 text-[#9aa1b8] hover:bg-[#fff6f6] hover:text-[#b4441f]" onClick={() => update(rows.filter((_, j) => j !== i))} data-testid={`button-delete-${kind}-${i}`}><Trash2 size={13} /></button>
            </div>
            {errors[i] && <p className="mt-0.5 text-[11px] text-[#9b2c2c]" data-testid={`error-${kind}-${i}`}>{errors[i]}</p>}
          </div>
        ))}
      </div>
      {tooMany && <p role="alert" className="mt-2 text-[11px] text-[#9b2c2c]">Limite de {MAX} entrées dépassée.</p>}
      {!valid && rows.length > 0 && <p role="status" className="mt-2 rounded-lg bg-[#fffaf0] p-2 text-[11px] text-[#7a5a12]" data-testid={`text-${kind}-pending`}>Votre saisie est conservée ici mais n'est pas transmise tant qu'elle contient des erreurs. La dernière version valide reste celle du brouillon.</p>}
    </div>
  );
}

function NumberField({ id, text, value, min, max, step, onCommit, help, onValid }: { id: string; text: string; value: number; min: number; max: number; step: number; onCommit: (n: number) => void; help: string; onValid: (v: boolean) => void }) {
  const [raw, setRaw] = useState(String(value));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setRaw(String(value)); } }, [value]);
  const n = Number(raw.replace(",", "."));
  const ok = raw.trim() !== "" && Number.isFinite(n) && n >= min && n <= max;
  const onValidRef = useRef(onValid);
  onValidRef.current = onValid;
  useEffect(() => { onValidRef.current(ok); }, [ok]);
  const set = (s: string) => {
    setRaw(s);
    const x = Number(s.replace(",", "."));
    if (s.trim() !== "" && Number.isFinite(x) && x >= min && x <= max && x !== last.current) { last.current = x; onCommit(x); }
  };
  return (
    <div>
      <label className={label} htmlFor={id}>{text}</label>
      <div className="mt-2 flex items-center gap-3">
        <input type="range" min={min} max={max} step={step} value={ok ? n : value} onChange={(e) => set(e.target.value)} className="flex-1 accent-[#3641f5]" aria-label={text} data-testid={`range-${id}`} />
        <input id={id} inputMode="decimal" className={`${input} !w-[90px] font-mono ${ok ? "" : "!border-[#e8b4b4]"}`} value={raw} onChange={(e) => set(e.target.value)} data-testid={`input-${id}`} />
      </div>
      {!ok && <p className="mt-1 text-[11px] text-[#9b2c2c]" data-testid={`error-${id}`}>Valeur entre {min} et {max} attendue. La valeur valide précédente ({value}) reste en vigueur dans le brouillon.</p>}
      <p className={hint}>{help}</p>
    </div>
  );
}

export function RetrievalEditor({ value, onChange, onValidityChange }: { value: RetrievalSettings; onChange: (value: RetrievalSettings) => void; onValidityChange?: (valid: boolean) => void }) {
  const [validity, setValidity] = useState<Record<string, boolean>>({});
  const mark = (k: string) => (v: boolean) => setValidity((s) => (s[k] === v ? s : { ...s, [k]: v }));
  const allValid = Object.values(validity).every(Boolean);
  const onValidityRef = useRef(onValidityChange);
  onValidityRef.current = onValidityChange;
  useEffect(() => { onValidityRef.current?.(allValid); }, [allValid]);
  const valueRef = useRef(value);
  valueRef.current = value;
  const patch = (p: Partial<RetrievalSettings>) => onChange({ ...valueRef.current, ...p });
  return (
    <div className="space-y-5" data-testid="retrieval-editor">
      <div className="rounded-xl border border-[#e3e6f8] bg-[#fbfbff] p-3 text-[12px] leading-5 text-[#48506a]">
        <strong className="text-[#2b3170]">Le score n'est pas une probabilité.</strong> C'est une mesure de proximité entre la question et une référence validée (mots communs, variantes, dictionnaires). 0,62 ne veut pas dire « 62 % de chances d'avoir raison ». Ces réglages complètent la configuration existante : les champs backend d'origine ne sont pas modifiés, et rien n'est actif avant « Valider et appliquer ».
      </div>
      <NumberField id="minimum-score" text="Score minimum" value={value.minimum_score} min={0.25} max={0.9} step={0.01} onCommit={(minimum_score) => patch({ minimum_score })} onValid={mark("minimum_score")}
        help="En dessous de ce score, Sabito ne répond pas et enregistre la question pour traitement. Plus haut : moins de réponses, plus sûres." />
      <NumberField id="ambiguity-margin" text="Marge d'ambiguïté" value={value.ambiguity_margin} min={0.03} max={0.3} step={0.01} onCommit={(ambiguity_margin) => patch({ ambiguity_margin })} onValid={mark("ambiguity_margin")}
        help="Si deux références ont des scores plus proches que cette marge, Sabito propose un choix au lieu de trancher seul." />
      <DictEditor kind="abbreviations" value={value.abbreviations} onChange={(abbreviations) => patch({ abbreviations })} onValid={mark("abbreviations")} />
      <DictEditor kind="corrections" value={value.corrections} onChange={(corrections) => patch({ corrections })} onValid={mark("corrections")} />
    </div>
  );
}
