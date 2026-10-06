import React from 'react';

/** Assinatura discreta da Sea-Ads Marketing; o logo troca sozinho entre o tema papel e o noturno. */
export default function SeaAds({ className = '', label = 'Um sistema' }) {
  return (
    <span className={`seaads ${className}`} role="img" aria-label={`${label} Sea-Ads Marketing`}>
      <span className="seaads-label" aria-hidden="true">
        {label}
      </span>
      <img className="seaads-logo seaads-light" src="/brand/sea-ads.png" alt="" width="90" height="24" />
      <img className="seaads-logo seaads-dark" src="/brand/sea-ads-branco.png" alt="" width="90" height="24" />
    </span>
  );
}
