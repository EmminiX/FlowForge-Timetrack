import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";
import { runMigrations } from "./lib/migrations";

// Initialize database on app startup
runMigrations()
  .then(() => {
    console.log("Database initialized");
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
