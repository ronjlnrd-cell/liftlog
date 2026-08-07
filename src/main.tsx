import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ConfirmProvider } from "./components/ConfirmProvider";
import { restTimerService } from "./services/restTimer/RestTimerService";
import { registerTimerServiceWorker } from "./services/restTimer/swBridge";

restTimerService.init();
void registerTimerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </BrowserRouter>
  </StrictMode>,
);
