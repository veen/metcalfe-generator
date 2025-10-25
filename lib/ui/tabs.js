export function attachTabs({ tabs, panels }) {
  const tabList = Array.from(tabs || []);
  const panelList = Array.from(panels || []);
  if (!tabList.length || !panelList.length) return;

  const panelMap = new Map(panelList.map((panel) => [panel.id, panel]));
  const listeners = [];

  const applyPanelLabel = (panelId, tabId) => {
    const panel = panelMap.get(panelId);
    if (!panel || !tabId) return;
    panel.setAttribute('aria-labelledby', tabId);
  };

  tabList.forEach((tab) => {
    const targetId = tab.dataset.target;
    if (targetId) {
      tab.setAttribute('aria-controls', targetId);
      applyPanelLabel(targetId, tab.id);
    }
  });

  const activateTab = (nextTab) => {
    if (!nextTab) return;
    const targetId = nextTab.dataset.target;

    tabList.forEach((tab) => {
      const isActive = tab === nextTab;
      tab.classList.toggle('tab-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panelMap.forEach((panel, panelId) => {
      const isActive = panelId === targetId;
      panel.classList.toggle('panel-active', isActive);
      panel.toggleAttribute('hidden', !isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      panel.setAttribute('tabindex', isActive ? '0' : '-1');
    });
  };

  const initialTab = tabList.find((tab) => tab.classList.contains('tab-active')) || tabList[0];
  activateTab(initialTab);

  tabList.forEach((tab) => {
    const handleClick = () => {
      if (tab.classList.contains('tab-active')) return;
      activateTab(tab);
      tab.focus();
    };

    const handleKeyDown = (event) => {
      const key = event.key;
      const currentIndex = tabList.indexOf(tab);
      let targetIndex = currentIndex;

      switch (key) {
        case 'ArrowRight':
          event.preventDefault();
          targetIndex = (currentIndex + 1) % tabList.length;
          break;
        case 'ArrowLeft':
          event.preventDefault();
          targetIndex = (currentIndex - 1 + tabList.length) % tabList.length;
          break;
        case 'Home':
          event.preventDefault();
          targetIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          targetIndex = tabList.length - 1;
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          activateTab(tab);
          return;
        default:
          return;
      }

      const targetTab = tabList[targetIndex];
      if (targetTab) {
        activateTab(targetTab);
        targetTab.focus();
      }
    };

    tab.addEventListener('click', handleClick);
    tab.addEventListener('keydown', handleKeyDown);
    listeners.push({ tab, handleClick, handleKeyDown });
  });

  return () => {
    listeners.forEach(({ tab, handleClick, handleKeyDown }) => {
      tab.removeEventListener('click', handleClick);
      tab.removeEventListener('keydown', handleKeyDown);
    });
  };
}
