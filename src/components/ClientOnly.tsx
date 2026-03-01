"use client";

import { useState, useEffect } from "react";

/**
 * Evita hydration mismatch quando extensões do navegador (ex: Bitdefender)
 * modificam o DOM antes do React hidratar. O conteúdo só é renderizado
 * no cliente, após o mount.
 */
export default function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <>{fallback}</>
    );
  }
  return <>{children}</>;
}
