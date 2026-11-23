import { useState, useEffect, type CSSProperties } from 'react';
import product from './product.json';
import { clampStep, nextStep, prevStep } from './flow';

const storageKey = 'rfb:' + product.slug + ':starter-step';
const lastStep = product.steps.length - 1;

export default function App() {
  const [step, setStep] = useState(() => {
    try { return clampStep(Number(window.localStorage.getItem(storageKey) ?? 0), lastStep); }
    catch { return 0; }
  });
  const [module, setModule] = useState(0);
  useEffect(() => {
    try { window.localStorage.setItem(storageKey, String(step)); }
    catch { /* Browser storage may be unavailable. */ }
  }, [step]);
  const theme = { '--accent': product.accent } as CSSProperties;
  return <div className="shell" style={theme}>
    <a className="skip" href="#conteudo">Pular para o conteúdo</a>
    <header className="topbar">
      <a className="brand" href="#conteudo" aria-label={product.name + ' início'}>{product.name}<span>.</span></a>
      <span className="status">RFB LABS · CONCEITO G1</span>
    </header>
    <main id="conteudo" className="layout">
      <section className="intro">
        <p className="eyebrow">Produto em planejamento</p>
        <h1>{product.name}</h1>
        <p className="slogan">{product.slogan}</p>
        <p className="lead">{product.segment}. Esta é uma interface demonstrativa do roteiro de requisitos, não a operação real.</p>
        <p className="disclaimer">Não há backend, usuários reais, pagamentos, modelos 3D funcionais ou mensagens entregues.</p>
      </section>
      <section className="workspace" aria-label="Jornada planejada">
        <div className="summary"><span>Fluxo do blueprint</span><strong>Etapa {step + 1} de {product.steps.length}</strong></div>
        <div className="progress" role="progressbar" aria-label="Progresso do roteiro" aria-valuenow={step+1} aria-valuemin={1} aria-valuemax={product.steps.length}><span style={{ width: String((step+1)/product.steps.length*100) + '%' }}/></div>
        <h2 aria-live="polite">{product.steps[step]}</h2>
        <p className="help">Esta etapa é apenas descrita. Os botões percorrem o roteiro e salvam localmente o número do passo.</p>
        <div className="controls">
          <button type="button" className="secondary" onClick={() => setStep(prevStep(step))} disabled={step===0}>Voltar</button>
          <button type="button" onClick={() => setStep(nextStep(step,lastStep))} disabled={step===lastStep}>Próxima etapa</button>
          <button type="button" className="secondary" onClick={() => setStep(0)}>Reiniciar</button>
        </div>
        <div className="modules">
          <h3>Módulos previstos (a implementar)</h3>
          <div className="chips" role="group" aria-label="Explorar módulos">
            {product.modules.map((m, i) => <button type="button" key={m} onClick={() => setModule(i)} className={module===i?'chip chosen':'chip'} aria-pressed={module===i}>{m}</button>)}
          </div>
          <p aria-live="polite"><strong>{product.modules[module]}</strong> está documentado, mas ainda não funciona.</p>
        </div>
      </section>
    </main>
    <footer className="footer">RFB Method · Starter Pack · Dados sintéticos · Não publicado</footer>
  </div>;
}
