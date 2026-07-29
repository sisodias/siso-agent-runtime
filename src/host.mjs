import { spawn } from "node:child_process";

export function buildHostInvocation(config, hostArguments = [], { profileText = "", sessionId } = {}) {
  if (!Array.isArray(hostArguments) || hostArguments.some((argument) => typeof argument !== "string")) {
    throw new TypeError("host arguments must be an array of strings");
  }
  const [executable, ...configuredArguments] = config.host.command;
  const environment = {
    ...process.env,
    ...config.host.env,
    SISO_AGENT_PROFILE: profileText,
    SISO_RUNTIME_SESSION_ID: sessionId ?? `session-${Date.now()}`
  };
  return {
    executable,
    arguments: [...configuredArguments, ...hostArguments],
    options: { cwd: config.host.cwd, env: environment, shell: false }
  };
}

export function publicInvocation(invocation) {
  return {
    executable: invocation.executable,
    arguments: invocation.arguments,
    cwd: invocation.options.cwd,
    shell: invocation.options.shell,
    injectedEnvironment: ["SISO_AGENT_PROFILE", "SISO_RUNTIME_SESSION_ID"]
  };
}

export async function runHost(invocation, { stdio = "inherit" } = {}) {
  return await new Promise((resolve, reject) => {
    const child = spawn(invocation.executable, invocation.arguments, {
      ...invocation.options,
      stdio
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}
