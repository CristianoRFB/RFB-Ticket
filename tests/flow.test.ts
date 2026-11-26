import { describe, expect, it } from 'vitest';
import { clampStep, nextStep, prevStep } from '../src/flow';
describe('roteiro local', () => { it('respeita limites', () => { expect(clampStep(NaN,5)).toBe(0); expect(clampStep(-1,5)).toBe(0); expect(nextStep(5,5)).toBe(5); expect(prevStep(0)).toBe(0); }); it('permite navegar', () => { expect(nextStep(1,5)).toBe(2); expect(prevStep(2)).toBe(1); }); });
