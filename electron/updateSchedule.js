const DAY_MS = 24 * 60 * 60 * 1000;

function createUpdateSchedule(check, now = Date.now) {
  let timer;
  let lastCheck = null;
  function markChecked() { lastCheck = now(); }
  function checkIfDue() {
    if (lastCheck !== null && now() - lastCheck < DAY_MS) return;
    markChecked();
    void check();
  }
  return {
    markChecked,
    checkIfDue,
    start() {
      if (timer) return;
      checkIfDue();
      // Recheck the deadline locally; contact the server only once a day.
      timer = setInterval(checkIfDue, 60 * 60 * 1000);
    },
    stop() { clearInterval(timer); timer = null; },
  };
}

module.exports = { createUpdateSchedule, DAY_MS };
