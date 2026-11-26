import { QRCodeSVG } from 'qrcode.react';
export default function QR({value}:{value:string}) {
  return <div className="qr-display">
    <QRCodeSVG value={value} size={190} bgColor="#ffffff" fgColor="#101020" level="H" title="Credencial QR demonstrativa"/>
    <small>QR demonstrativo — validade depende do servidor e do evento sandbox.</small>
    <details><summary>Código manual de recuperação</summary><code className="token-code">{value}</code></details>
  </div>;
}
