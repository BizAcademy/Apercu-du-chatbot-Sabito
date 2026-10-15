import type { AssistantSettings } from "@workspace/api-client-react";
import { MESSAGE_FIELDS } from "./validate";
import { hint, input, label } from "./styles";

export function MessagesEditor({ value, onChange }: { value: AssistantSettings; onChange: (patch: Partial<AssistantSettings>) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {MESSAGE_FIELDS.map((m) => {
        const v = value[m.key] as string;
        return (
          <div key={m.key}>
            <label className={label} htmlFor={`msg-${m.key}`}>{m.label}{m.optional && <span className="font-normal text-[#8b92a8]"> (optionnel)</span>}</label>
            <textarea id={`msg-${m.key}`} className={`${input} mt-1 min-h-[76px]`} maxLength={4000} value={v} onChange={(e) => onChange({ [m.key]: e.target.value } as Partial<AssistantSettings>)} data-testid={`input-msg-${m.key}`} />
            <p className={hint}>{m.help} <span className="float-right">{v.length}/4000</span></p>
          </div>
        );
      })}
    </div>
  );
}
