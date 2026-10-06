import React from 'react';

/** Assinatura discreta da Sea-Ads Marketing: só o logo, com link e UTM de onde o clique veio. */
export const seaAdsUrl = (where) => `https://sea-ads.com.br/?utm_source=dossie-icp&utm_medium=referral&utm_campaign=assinatura-sistema&utm_content=${encodeURIComponent(where)}`;

export default function SeaAds({ where = 'app', className = '' }) {
  return (
    <a className={`seaads ${className}`} href={seaAdsUrl(where)} target="_blank" rel="noopener" aria-label="Sea-Ads Marketing (abre o site em nova aba)">
      <img className="seaads-logo seaads-light" src="/brand/sea-ads.png" alt="" width="90" height="24" />
      <img className="seaads-logo seaads-dark" src="/brand/sea-ads-branco.png" alt="" width="90" height="24" />
    </a>
  );
}
