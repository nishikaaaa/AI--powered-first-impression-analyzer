import type { Clock } from "../../../platform/ai/ports/Clock.js";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  nowMs(): number {
    return Date.now();
  }
}
