"use client";

import { useEffect } from "react";

/**
 * Ouvre et montre l'action visée par l'ancre (#cle), quand on arrive depuis « Cette semaine ».
 * Ne touche pas aux classes (le surlignage passe par :target en CSS) pour ne pas gêner l'hydratation.
 */
export function OuvrirAncre() {
  useEffect(() => {
    const ouvrir = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t = setTimeout(ouvrir, 600);
    window.addEventListener("hashchange", ouvrir);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", ouvrir);
    };
  }, []);
  return null;
}
