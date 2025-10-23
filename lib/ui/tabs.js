export function attachTabs({ tabs, panels }) {
  const tabList = Array.from(tabs || []);
  if (!tabList.length || !panels) return;

  const panelMap = new Map(Array.from(panels).map((panel) => [panel.id, panel]));

  tabList.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('tab-active')) return;
      tabList.forEach((btn) => {
        btn.classList.toggle('tab-active', btn === tab);
        btn.setAttribute('aria-selected', btn === tab ? 'true' : 'false');
      });
      panelMap.forEach((panel) => panel.classList.remove('panel-active'));
      const targetPanel = panelMap.get(tab.dataset.target);
      if (targetPanel) {
        targetPanel.classList.add('panel-active');
      }
    });
  });
}
