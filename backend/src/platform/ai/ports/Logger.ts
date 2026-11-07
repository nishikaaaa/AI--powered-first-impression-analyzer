export type LogFields = Record<string, unknown>;

export interface Logger {
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}
