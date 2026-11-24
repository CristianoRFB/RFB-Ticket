/** Human-readable, non-sensitive status messages for sandbox API failures. */
const apiMessages:Record<string,string>={
  UNAUTHORIZED:'Sessão inválida ou encerrada. Entre novamente.',
  AUTH_UNAVAILABLE:'Autenticação indisponível no momento. Tente novamente.',
  NO_PERMISSION:'Sua conta não tem permissão para esta operação.',
  NOT_FOUND:'Registro não encontrado ou indisponível.',
  INVALID_TICKET:'Ingresso inválido ou QR expirado. Não autorize a entrada.',
  ALREADY_USED:'Ingresso já utilizado. Entrada recusada.',
  ALREADY_USED_OR_REVOKED:'Ingresso já utilizado ou revogado. Entrada recusada.',
  TICKET_NOT_VALID:'Ingresso não está válido para entrada.',
  SOLD_OUT_OR_UNAVAILABLE:'Vagas esgotadas ou lote pausado. Atualize a disponibilidade.',
  ACTIVE_HOLD_LIMIT:'Você atingiu o limite de cinco reservas ativas. Cancele ou conclua uma antes de tentar novamente.',
  ORDER_EXPIRED_OR_INVALID:'A reserva expirou ou não pode ser confirmada. Selecione o lote novamente.',
  INVALID_ORDER_STATE:'A reserva já mudou de estado. Atualize seus pedidos.',
  EVENT_CANCELLATION_DENIED:'Não é possível cancelar um evento após o primeiro check-in, ou ele já foi cancelado.',
  INVALID_EVENT_STATE:'O evento foi cancelado ou não pode mais ser alterado.',
  REFUND_DENIED:'Este ingresso não é elegível a reembolso fictício.',
  TRANSFER_DENIED:'Esta credencial não pode ser transferida novamente.',
  IDEMPOTENCY_CONFLICT:'Esta tentativa já foi utilizada com outra reserva.',
  INVALID_SEARCH:'Filtros de busca inválidos.',
  INVALID_PAGE:'Número de página inválido.',
  REPORT_EXPORT_LIMIT:'Relatório grande demais para exportação única.',
  AUTH_UNCONFIGURED:'Autenticação de teste ainda não configurada.',
  DATABASE_NOT_CONFIGURED:'Banco de dados de sandbox ainda não configurado.',
  SERVICE_UNAVAILABLE:'Serviço temporariamente indisponível. Verifique a conexão e tente novamente.',
  NETWORK_ERROR:'Não foi possível conectar. Repetir uma tentativa de reserva ou check-in é seguro com o mesmo identificador.',
};
export function errorMessage(error:unknown):string{
  const code=error instanceof Error?error.message:String(error||'');
  if(apiMessages[code])return apiMessages[code];
  if(/auth\/(invalid-credential|wrong-password|user-not-found)/.test(code))return 'E-mail ou senha inválidos.';
  if(/auth\/email-already-in-use/.test(code))return 'O e-mail já está em uso.';
  if(/auth\/weak-password/.test(code))return 'Escolha uma senha mais forte.';
  if(/auth\/network-request-failed/.test(code)||error instanceof TypeError)return apiMessages.NETWORK_ERROR;
  return code||'Erro inesperado. Tente novamente.';
}
