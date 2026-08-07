import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { registerTimerServiceWorker } from "./services/restTimer/swBridge";
import { restTimerService } from "./services/restTimer/RestTimerService";

void registerTimerServiceWorker().then(() => {
  restTimerService.init();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BrowserRouter>
  </StrictMode>,
);
