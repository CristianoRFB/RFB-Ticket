import {describe,it,expect} from 'vitest';
import {selectCheckinAttempt} from '../src/checkinRequest';

describe('check-in idempotency on unstable networks',()=>{
  it('retains request ID on retry of same QR/event',()=>{
    const first=selectCheckinAttempt(null,'event-a',' QR-1 ',()=> 'request-a');
    const retry=selectCheckinAttempt(first,'event-a','QR-1',()=>{throw Error('must reuse')});
    expect(retry).toBe(first);expect(retry.requestId).toBe('request-a');
  });
  it('rotates request ID for new QR or event',()=>{
    const first=selectCheckinAttempt(null,'a','QR',()=> 'id-1');
    expect(selectCheckinAttempt(first,'a','NEW',()=> 'id-2').requestId).toBe('id-2');
    expect(selectCheckinAttempt(first,'b','QR',()=> 'id-3').requestId).toBe('id-3');
  });
  it('normalizes pasted codes before comparing',()=>{
    expect(selectCheckinAttempt(null,'a','  QR  ',()=> 'id').token).toBe('QR');
  });
});
