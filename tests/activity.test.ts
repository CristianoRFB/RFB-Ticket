import {describe,it,expect} from 'vitest';
import {recentActivity} from '../src/activity';
describe('signed-in in-app activity projection',()=>{
 it('sorts own order/ticket statuses without displaying QR tokens',()=>{
  const feed=recentActivity(
   [{id:'order-test',status:'held',quantity:1,created_at:10}],
   [{id:'ticket-test',ticket_number:23,status:'used',used_at:30,token:'SECRET_QR'}]);
  expect(feed.map(x=>x.title)).toEqual(['Ingresso #000023','Pedido order-te']);
  expect(feed[0].detail).toBe('Entrada registrada');
  expect(JSON.stringify(feed)).not.toContain('SECRET_QR');
 });
 it('returns an empty list and safe fallback statuses',()=>{
  expect(recentActivity([],[])).toEqual([]);
  expect(recentActivity([{id:'abc',status:'unknown',quantity:1}],[])[0].detail).toBe('Status atualizado');
 });
});
