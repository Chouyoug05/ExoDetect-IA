import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import Starfield from "./components/Starfield";

createRoot(document.getElementById("root")!).render(
  <>
    <Starfield />
    <App />
  </>
);
