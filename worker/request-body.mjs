// Limit bytes as they arrive, not UTF-16 characters after buffering the entire request.
export async function readBoundedUtf8(request, limit) {
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > limit) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  let total = 0;
  let text = '';
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('PAYLOAD_TOO_LARGE');
      text += decoder.decode(value, {stream: true});
    }
    return text + decoder.decode();
  } catch (error) {
    // Do not wait for cancellation of an untrusted stream.
    void reader.cancel().catch(() => {});
    if (error?.message === 'PAYLOAD_TOO_LARGE') throw error;
    throw new Error('INVALID_BODY');
  } finally {
    reader.releaseLock();
  }
}
