import { spawn } from "child_process";

// THIS IS A REPLIT BOOTSTRAPPER.
// THE ACTUAL BACKEND IS WRITTEN IN PURE GOLANG (main.go).
// NODE.JS IS ONLY USED TO LAUNCH THE GO PROCESS.

console.log("Launching Go Backend...");

const go = spawn("go", ["run", "main.go"], { 
  stdio: "inherit"
});

go.on("close", (code) => {
  process.exit(code ?? 0);
});
