/** Retry the exact same admission request after a lost HTTP response. No browser storage. */
export type CheckinAttempt={eventId:string;token:string;requestId:string};
export function selectCheckinAttempt(
  pending:CheckinAttempt|null,
  eventId:string,
  token:string,
  newId:()=>string=()=>crypto.randomUUID()
):CheckinAttempt{
  const normalized=token.trim();
  if(pending?.eventId===eventId && pending.token===normalized)return pending;
  return {eventId,token:normalized,requestId:newId()};
}
