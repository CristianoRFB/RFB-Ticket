import { useState } from 'react';
import DemoApp from './DemoApp';
import LiveApp from './LiveApp';
import { firebaseConfigured } from './firebase';
import './live.css';

export default function App() {
  const [mode,setMode] = useState<'demo'|'sandbox'>('demo');
  return <>
    <div className="mode-bar" role="group" aria-label="Modo de funcionamento">
      <strong>RFBTicket</strong>
      <button type="button" aria-pressed={mode==='demo'} onClick={()=>setMode('demo')}>Explorar demonstração</button>
      <button type="button" disabled={!firebaseConfigured} aria-pressed={mode==='sandbox'} onClick={()=>setMode('sandbox')}>Sandbox autenticado</button>
      {!firebaseConfigured && <span>Sandbox indisponível: configure Firebase e Worker</span>}
    </div>
    {mode==='demo' ? <DemoApp/> : <LiveApp/>}
  </>;
}
