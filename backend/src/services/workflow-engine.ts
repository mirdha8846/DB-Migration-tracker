type StepFn = (results: Record<string, any>) => Promise<any>;
type ErrorHandler = (err: Error, step: string) => Promise<void>;

interface WorkflowStep {
  name: string;
  fn: StepFn;
  timeout?: number;
  retries?: number;
}

class WorkflowEngine {
  async execute(workflowName: string, steps: WorkflowStep[], onError?: ErrorHandler): Promise<Record<string, any>> {
    console.log(`⚙️  Workflow [${workflowName}] started (${steps.length} steps)`);
    const results: Record<string, any> = {};
    const startTime = Date.now();

    for (const step of steps) {
      const stepStart = Date.now();
      let attempts = 0;
      const maxRetries = step.retries || 2;

      while (attempts <= maxRetries) {
        try {
          console.log(`  ↳ Step: ${step.name}${attempts > 0 ? ` (retry ${attempts})` : ""}`);
          results[step.name] = await withTimeout(step.fn(results), step.timeout || 60000);
          const duration = Date.now() - stepStart;
          console.log(`  ✅ ${step.name} completed (${duration}ms)`);
          break;
        } catch (err: any) {
          attempts++;
          console.error(`  ❌ ${step.name} failed (attempt ${attempts}): ${err.message}`);
          if (attempts > maxRetries) {
            if (onError) await onError(err, step.name);
            throw err;
          }
          await sleep(1000 * attempts);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`⚙️  Workflow [${workflowName}] completed (${totalDuration}ms)`);
    return results;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Step timed out")), ms)),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const workflowEngine = new WorkflowEngine();
