import { EventEmitter } from "events";

type EventHandler = (payload: any) => Promise<void> | void;

class EventBus {
  private emitter = new EventEmitter();

  publish(topic: string, payload: any): void {
    console.log(`📡 [Kafka→Local] ${topic}: ${JSON.stringify(payload).substring(0, 100)}`);
    this.emitter.emit(topic, payload);
  }

  subscribe(topic: string, handler: EventHandler): void {
    this.emitter.on(topic, (payload) => {
      Promise.resolve(handler(payload)).catch((err: Error) => {
        console.error(`EventBus handler error [${topic}]:`, err.message);
      });
    });
  }
}

export const eventBus = new EventBus();

// Kafka topics (as defined in step-2.md)
export const TOPICS = {
  SCHEMA_ANALYSIS_COMPLETE: "schema.analysis.complete",
  SCAN_COMPLETE: "scan.complete",
  AI_ANALYSIS_COMPLETE: "ai.analysis.complete",
} as const;
