import {describe,it,expect} from 'vitest';
import {errorMessage} from '../src/errorMessages';

describe('client errors',()=>{
 it('informs race and idempotency safely',()=>{
  expect(errorMessage(new Error('SOLD_OUT_OR_UNAVAILABLE'))).toMatch(/Vagas esgotadas/);
  expect(errorMessage(new Error('ACTIVE_HOLD_LIMIT'))).toMatch(/cinco reservas/);
  expect(errorMessage(new Error('ALREADY_USED'))).toMatch(/Entrada recusada/);
 });
 it('does not leak which email exists in Firebase',()=>{
  expect(errorMessage(new Error('Firebase: Error (auth/user-not-found)'))).toBe('E-mail ou senha inválidos.');
 });
 it('explains temporary connection errors',()=>{
  expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/conectar/);
 });
});
