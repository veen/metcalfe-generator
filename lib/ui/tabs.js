export function attachTabs({ tabs, panels }) {
  const tabList = Array.from(tabs || []);
  if (!tabList.length || !panels) return;

  const panelMap = new Map(Array.from(panels).map((panel) => [panel.id, panel]));
  panelMap.forEach((panel) => {
    const isActive = panel.classList.contains('panel-active');
    panel.toggleAttribute('hidden', !isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

  tabList.forEach((tab) => {
    const targetId = tab.dataset.target;
    if (targetId) {
      tab.setAttribute('aria-controls', targetId);
    }
  });

  tabList.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('tab-active')) return;
      tabList.forEach((btn) => {
        btn.classList.toggle('tab-active', btn === tab);
        btn.setAttribute('aria-selected', btn === tab ? 'true' : 'false');
      });
      panelMap.forEach((panel) => {
        panel.classList.remove('panel-active');
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('hidden', 'hidden');
      });
      const targetPanel = panelMap.get(tab.dataset.target);
      if (targetPanel) {
        targetPanel.classList.add('panel-active');
        targetPanel.removeAttribute('hidden');
        targetPanel.setAttribute('aria-hidden', 'false');
      }
    });
  });
}
