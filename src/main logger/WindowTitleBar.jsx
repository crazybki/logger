import { Minus, X } from "lucide-react";

function WindowTitleBar() {
  return (
    <div className="window-titlebar">
      <div className="window-titlebar-drag">
        <span className="window-titlebar-title">Time Logger</span>
      </div>

      <div className="window-titlebar-actions">
        <button
          type="button"
          className="window-titlebar-btn"
          onClick={() => window.loggerAPI?.minimizeWindow?.()}
          title="Minimize"
        >
          <Minus size={16} />
        </button>

        <button
          type="button"
          className="window-titlebar-btn close"
          onClick={() => window.loggerAPI?.closeWindow?.()}
          title="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default WindowTitleBar;