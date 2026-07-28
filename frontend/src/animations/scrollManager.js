let activeScrollAdapter;

export const registerScrollAdapter = (adapter) => {
  activeScrollAdapter = adapter;

  return () => {
    if (activeScrollAdapter === adapter) activeScrollAdapter = undefined;
  };
};

export const scrollToPosition = (top, { immediate = false, onComplete } = {}) => {
  if (activeScrollAdapter) {
    activeScrollAdapter.scrollTo(top, {
      duration: immediate ? 0 : 0.9,
      immediate,
      onComplete,
    });
    return;
  }

  if (immediate) {
    window.scrollTo({ top, behavior: "auto" });
    onComplete?.();
    return;
  }

  let fallbackTimer;
  const complete = () => {
    window.clearTimeout(fallbackTimer);
    window.removeEventListener("scrollend", complete);
    onComplete?.();
  };

  window.addEventListener("scrollend", complete, { once: true });
  fallbackTimer = window.setTimeout(complete, 1200);
  window.scrollTo({
    top,
    behavior: "smooth",
  });
};
