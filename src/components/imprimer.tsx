"use client";

import { Printer } from "lucide-react";

export function Imprimer() {
  return (
    <button onClick={() => window.print()} className="bouton print:hidden">
      <Printer className="h-3.5 w-3.5" /> Enregistrer en PDF
    </button>
  );
}
