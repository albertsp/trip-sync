import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// `strict` makes any accidental full `motion.*` import fail loudly, keeping the lazy bundle small.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionConfig>
    </LazyMotion>
  </StrictMode>,
);
