import { useEffect, useState } from "react";

function isStandaloneMode() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function useStandaloneMode() {
  const [standalone, setStandalone] = useState(() => isStandaloneMode());

  useEffect(() => {
    const query = window.matchMedia("(display-mode: standalone)");
    function update() {
      setStandalone(isStandaloneMode());
      document.documentElement.classList.toggle("kv-standalone-app", isStandaloneMode());
    }

    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  return standalone;
}
