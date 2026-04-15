/**
 * app.js — Entry point
 * Load order: graph → algorithms → graphView → outputDisplay → inputHandler → controls → trafficSliders → multiCriteriaPage → app
 */
document.addEventListener("DOMContentLoaded", () => {
  GraphView.init();
  Controls.init();
  MultiCriteriaPage.init();
  Graph.loadSample();
  InputHandler.refreshAll();
  GraphView.fitView();
  setTimeout(() => {
    Controls.toast("Sample graph loaded — try Multi-Criteria Analysis!", "info", 3500);
  }, 700);
});
