'use client';
import React, { useEffect, useState } from 'react';

/**
 * Composant SVG qui ne rend que côté client pour éviter les erreurs d'hydration React.
 * Utilise dangerouslySetInnerHTML dans un span pour injecter du SVG pur.
 */
export default function SvgIcon({ svg, width = 16, height = 16, style = {} }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    // Côté serveur : rendre un placeholder de même taille
    return <span style={{ display: 'inline-block', width, height, ...style }} />;
  }

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width, height, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
