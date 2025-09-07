export type LogCtx = { runId: string; projectId: string; step: string; sectionId?: string };

export function logInfo(ctx: LogCtx, msg: string, extra: Record<string, any> = {}) {
  console.log(JSON.stringify({ level: 'info', t: Date.now(), ...ctx, msg, ...extra }));
}

export function logError(ctx: LogCtx, err: unknown, extra: Record<string, any> = {}) {
  const e: any = err;
  console.error(JSON.stringify({ level: 'error', t: Date.now(), ...ctx, msg: e?.message || String(err), stack: e?.stack, ...extra }));
}

