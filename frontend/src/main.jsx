import "./styles/globals.css";
import "locomotive-scroll/locomotive-scroll.css";

import ReactDOM from "react-dom/client";

import App from "./App";
import { initializeObservability } from "./observability";

initializeObservability();

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
