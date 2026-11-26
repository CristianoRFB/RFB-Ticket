import {describe,it,expect,vi,afterEach} from 'vitest';
import {api} from '../src/api';
afterEach(()=>vi.unstubAllGlobals());
describe('API client service failures',()=>{
  it('preserves an explicit network failure code for safe checkout retries',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(api('/api/orders',null,'POST',{lotId:'test'})).rejects.toThrow('NETWORK_ERROR');
  });
  it('does not attempt to parse a non-JSON gateway error as business data',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<h1>503</h1>',{status:503,headers:{'content-type':'text/html'}})));
    await expect(api('/api/events',null)).rejects.toThrow('SERVICE_UNAVAILABLE');
  });
  it('propagates structured conflict responses for a localized message',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:'ACTIVE_HOLD_LIMIT'},{status:429})));
    await expect(api('/api/orders',null,'POST',{})).rejects.toThrow('ACTIVE_HOLD_LIMIT');
  });
});
