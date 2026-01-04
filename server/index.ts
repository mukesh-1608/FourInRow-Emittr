import { spawn } from "child_process";

// CRITICAL: This is ONLY a wrapper to satisfy the Replit environment's entrypoint.
// The backend is written in PURE GOLANG (main.go). 
// NO application logic exists in this file.

const go = spawn("go", ["run", "main.go"], { 
  stdio: "inherit"
});

go.on("close", (code) => {
  process.exit(code ?? 0);
});
