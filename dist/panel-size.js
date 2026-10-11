// src/panel-size.ts
function measurePanelHeight(content) {
  const panel = content.parentElement;
  if (!panel) return content.offsetHeight;
  const style = getComputedStyle(panel);
  const chrome = style.boxSizing === "border-box" ? [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth].reduce((total, value) => total + (parseFloat(value) || 0), 0) : 0;
  return content.offsetHeight + chrome;
}
function observePanelHeader(folder) {
  const header = folder.firstElementChild;
  if (!header) return () => {
  };
  const update = () => {
    folder.style.setProperty("--dial-panel-header-height", `${header.offsetHeight}px`);
  };
  const observer = new ResizeObserver(update);
  observer.observe(header);
  update();
  return () => {
    observer.disconnect();
    folder.style.removeProperty("--dial-panel-header-height");
  };
}
var panelFolds = /* @__PURE__ */ new WeakMap();
function finishSectionFold(section) {
  for (const element of [section.content, section.toolbar]) {
    element.style.display = section.open ? "" : "none";
    element.style.removeProperty("height");
    element.inert = !section.open;
  }
  section.onSettled?.(section.open);
}
function createPanelSectionTransition(folder, initiallyOpen, onSettled) {
  const content = folder.querySelector(":scope > .dialkit-folder-content");
  const toolbar = folder.querySelector(":scope > .dialkit-folder-header > .dialkit-panel-section-toolbar-clip");
  let open = initiallyOpen;
  let panel = null;
  finishSectionFold({ content, toolbar, open, onSettled });
  return {
    setOpen(next) {
      if (next === open) return;
      open = next;
      panel = folder.closest(".dialkit-panel-inner");
      if (!panel) {
        finishSectionFold({ content, toolbar, open, onSettled });
        return;
      }
      const root = panel.querySelector(":scope > .dialkit-folder-root");
      const shell = panel.closest(".dialkit-panel");
      const inline = panel.classList.contains("dialkit-panel-inline");
      let group = panelFolds.get(panel);
      if (!group) {
        group = { sections: /* @__PURE__ */ new Map(), frame: 0 };
        panelFolds.set(panel, group);
      }
      cancelAnimationFrame(group.frame);
      const panelFrom = parseFloat(getComputedStyle(panel).height);
      const scrollFrom = panel.scrollTop;
      const section = group.sections.get(folder) ?? {
        content,
        toolbar,
        open,
        onSettled,
        fromContent: 0,
        toContent: 0,
        fromToolbar: 0,
        toToolbar: 0
      };
      section.open = open;
      group.sections.set(folder, section);
      for (const fold of group.sections.values()) {
        fold.fromContent = fold.content.offsetHeight;
        fold.fromToolbar = fold.toolbar.offsetHeight;
        for (const [element, height] of [[fold.content, fold.fromContent], [fold.toolbar, fold.fromToolbar]]) {
          element.style.height = `${height}px`;
          element.style.display = "";
          element.inert = !fold.open;
        }
        fold.toContent = fold.open ? fold.content.firstElementChild.offsetHeight : 0;
        fold.toToolbar = fold.open ? fold.toolbar.firstElementChild.offsetHeight : 0;
      }
      const fullTarget = measurePanelHeight(root) + [...group.sections.values()].reduce(
        (delta, fold) => delta + fold.toContent - fold.fromContent + fold.toToolbar - fold.fromToolbar,
        0
      );
      const limits = [window.innerHeight - 32, parseFloat(getComputedStyle(panel).maxHeight)];
      if (shell) limits.push(parseFloat(getComputedStyle(shell).maxHeight));
      const panelTo = Math.min(fullTarget, ...limits.filter(Number.isFinite));
      const scrollTo = Math.min(scrollFrom, Math.max(0, fullTarget - panelTo));
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
      const started = performance.now();
      const activePanel = panel;
      const activeGroup = group;
      const heightHost = activePanel.parentElement;
      const heightBefore = activePanel.style.height;
      activePanel.setAttribute("data-folding", "true");
      const tick = (now) => {
        const time = duration === 0 ? 1 : Math.min(1, Math.max(0, (now - started) / duration));
        const progress = 1 - (1 - time) ** 3;
        for (const fold of activeGroup.sections.values()) {
          fold.content.style.height = `${fold.fromContent + (fold.toContent - fold.fromContent) * progress}px`;
          fold.toolbar.style.height = `${fold.fromToolbar + (fold.toToolbar - fold.fromToolbar) * progress}px`;
        }
        if (!inline) {
          heightHost.style.setProperty("--dial-panel-fold-height", `${panelFrom + (panelTo - panelFrom) * progress}px`);
          activePanel.scrollTop = scrollFrom + (scrollTo - scrollFrom) * progress;
        }
        if (time < 1) {
          activeGroup.frame = requestAnimationFrame((next2) => tick(next2));
          return;
        }
        for (const fold of activeGroup.sections.values()) finishSectionFold(fold);
        activeGroup.sections.clear();
        activeGroup.frame = requestAnimationFrame(() => {
          if (!inline && activePanel.dataset.collapsed !== "true") activePanel.style.height = heightBefore;
          activePanel.removeAttribute("data-folding");
          heightHost.style.removeProperty("--dial-panel-fold-height");
          panelFolds.delete(activePanel);
        });
      };
      tick(started);
    },
    destroy() {
      if (!panel) return;
      const group = panelFolds.get(panel);
      group?.sections.delete(folder);
      if (group && group.sections.size === 0) {
        cancelAnimationFrame(group.frame);
        panel.removeAttribute("data-folding");
        panel.parentElement?.style.removeProperty("--dial-panel-fold-height");
        panelFolds.delete(panel);
      }
    }
  };
}
function observeScrollFades(root) {
  const scroller = root.parentElement;
  if (!scroller || CSS.supports("container-type", "scroll-state")) return () => {
  };
  let frame = 0;
  const update = () => {
    frame = 0;
    const headers = Array.from(root.querySelectorAll(".dialkit-folder-header"));
    const stuck = headers.map((header) => {
      if (header.parentElement === root) return scroller.scrollTop > 0;
      const folder = header.parentElement;
      return header.getBoundingClientRect().top - folder.getBoundingClientRect().top - folder.clientTop > 0.5;
    });
    const more = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
    headers.forEach((header, index) => header.toggleAttribute("data-stuck", stuck[index]));
    scroller.toggleAttribute("data-more", more);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(() => update());
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(root);
  scroller.addEventListener("scroll", schedule, { passive: true });
  schedule();
  return () => {
    resize.disconnect();
    scroller.removeEventListener("scroll", schedule);
    cancelAnimationFrame(frame);
  };
}
export {
  createPanelSectionTransition,
  measurePanelHeight,
  observePanelHeader,
  observeScrollFades
};
//# sourceMappingURL=panel-size.js.map