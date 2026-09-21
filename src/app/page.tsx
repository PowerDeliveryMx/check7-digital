import Script from "next/script";

export default function Check7Page() {
  return (
    <>
      <div id="phone">
        <header className="topbar">
          <div className="brand-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo pequeño (24px), no es el LCP */}
            <img className="brand-logo" src="/logo.png" alt="Power Delivery" />
            <div className="folio" id="folioTag">
              &nbsp;
            </div>
          </div>
          <div className="phase-label" id="phaseLabel">
            Datos del servicio
          </div>
          <div className="stepper" id="stepper" />
          <div className="progress-caption" id="progressCaption">
            Paso 1 de 13
          </div>
        </header>
        <main id="app" />
        <footer className="navbar" id="navbar" />
      </div>
      <div className="toast" id="toast" />
      <Script src="/check7.js" strategy="afterInteractive" />
    </>
  );
}
