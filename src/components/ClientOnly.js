'use client';
import React, { useEffect, useState } from 'react';

/**
 * Composant wrapper qui ne rend ses enfants que côté client.
 * Évite les erreurs d'hydration React (#425, #418, #423) quand
 * on utilise des éléments HTML natifs (div, input, audio, etc.)
 * dans un contexte React Native Web / Next.js SSR.
 */
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return fallback;
  return <>{children}</>;
}
