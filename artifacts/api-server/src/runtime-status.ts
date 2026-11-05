type Runtime = {release:string;startedAt:string};
const bootstrap=(globalThis as typeof globalThis & {__sabitoRuntime?:Runtime}).__sabitoRuntime;
const runtime=Object.freeze({
  release:bootstrap&&/^[a-f0-9]{64}$/.test(bootstrap.release)?bootstrap.release:"development",
  startedAt:bootstrap&&Number.isFinite(Date.parse(bootstrap.startedAt))?
    bootstrap.startedAt:new Date().toISOString(),
});

/** Public, non-secret deployment identity. No PID, server path or credentials. */
export function runtimeStatus() {return runtime;}
