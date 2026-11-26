import {describe,it,expect} from 'vitest';
import {selectReservationAttempt} from '../src/reservationRequest';

describe('reservation retry idempotency',()=>{
 it('reuses key for same lot and quantity after an uncertain response',()=>{
  const first=selectReservationAttempt(null,'lot',2,()=> 'r1');
  expect(selectReservationAttempt(first,'lot',2,()=>{throw Error('must not rotate')})).toBe(first);
 });
 it('creates new key when lot or quantity changes',()=>{
  const prior=selectReservationAttempt(null,'lot',1,()=> 'r1');
  expect(selectReservationAttempt(prior,'lot',2,()=> 'r2').requestKey).toBe('r2');
  expect(selectReservationAttempt(prior,'other',1,()=> 'r3').requestKey).toBe('r3');
 });
});
