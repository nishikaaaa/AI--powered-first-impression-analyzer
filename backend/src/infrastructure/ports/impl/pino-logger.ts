import pino from "pino";
import type { Logger, LogFields } from "../../../platform/ai/ports/Logger.js";

export function createPinoLogger(): Logger {
  const root = pino({
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  });

  const wrap = (log: pino.Logger): Logger => ({
    info: (msg, fields) => log.info(fields ?? {}, msg),
    warn: (msg, fields) => log.warn(fields ?? {}, msg),
    error: (msg, fields) => log.error(fields ?? {}, msg),
    child: (bindings) => wrap(log.child(bindings as LogFields)),
  });

  return wrap(root);
}
