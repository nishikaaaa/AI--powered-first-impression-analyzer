import type { Redis } from "ioredis";
import type {
  AnalysisEvent,
  NotificationPublisher,
} from "../../../platform/ai/ports/NotificationPublisher.js";

export class RedisNotificationPublisher implements NotificationPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(channel: string, event: AnalysisEvent): Promise<void> {
    await this.redis.publish(channel, JSON.stringify(event));
  }
}
