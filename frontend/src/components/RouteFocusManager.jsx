import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const RouteFocusManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const heading = document.querySelector("main h1, [role='main'] h1, h1");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }, [pathname]);

  return null;
};
