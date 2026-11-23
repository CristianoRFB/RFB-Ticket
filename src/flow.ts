export function clampStep(v: number, max: number): number { return Number.isFinite(v) ? Math.max(0, Math.min(Math.trunc(v), Math.max(0,max))) : 0; }
export function nextStep(v: number, max: number): number { return clampStep(v+1,max); }
export function prevStep(v: number): number { return Math.max(0,v-1); }
