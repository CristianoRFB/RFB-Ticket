/** Keeps a reservation idempotent when the network drops after DB commit. */
export type ReservationAttempt={lotId:string;quantity:number;requestKey:string};
export function selectReservationAttempt(
  pending:ReservationAttempt|null,
  lotId:string,
  quantity:number,
  newId:()=>string=()=>crypto.randomUUID()
):ReservationAttempt{
  if(pending?.lotId===lotId&&pending.quantity===quantity)return pending;
  return {lotId,quantity,requestKey:newId()};
}
