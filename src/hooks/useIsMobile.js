import { useEffect, useState } from "react";
import { isMobileDevice } from "../utils/device.js";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(isMobileDevice);

  useEffect(() => {
    const update = () => setIsMobile(isMobileDevice());

    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 768px)");
    coarse.addEventListener("change", update);
    narrow.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      coarse.removeEventListener("change", update);
      narrow.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return isMobile;
}
