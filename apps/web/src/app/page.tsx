"use client";

import { useEffect, useState } from "react";
import { CallPanel } from "@/components/CallPanel";

// Inicio: la pantalla de llamada. Con ?mock=1 en la dirección, la llamada es simulada (no necesita backend).
export default function Home() {
  const [mock, setMock] = useState(false);
  useEffect(() => {
    setMock(new URLSearchParams(window.location.search).get("mock") === "1");
  }, []);
  return <CallPanel mock={mock} />;
}
