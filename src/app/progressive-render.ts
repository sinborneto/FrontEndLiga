// Share the frame budget across lists, including groups loading simultaneously.
const pending = new Set<ProgressiveRender>();
let frame = 0;
let idle = 0;
let generation = 0;
function schedule() {
  if (frame || idle || !pending.size) return;
  const current = generation;
  frame = requestAnimationFrame(() => {
    if (current !== generation) return;
    frame = 0;
    const flush = () => {
      if (current !== generation) return;
      idle = 0;
      const next = pending.values().next().value as ProgressiveRender | undefined;
      if (next) {
        pending.delete(next);
        next.tick();
      }
      schedule();
    };
    if (typeof window.requestIdleCallback === 'function')
      idle = window.requestIdleCallback(flush, { timeout: 150 });
    else flush();
  });
}
export class ProgressiveRender {
  private task?: { step: () => boolean; done: () => void };
  run(step: () => boolean, done: () => void) {
    this.cancel();
    this.task = { step, done };
    pending.add(this);
    schedule();
  }
  tick() {
    const task = this.task;
    if (!task) return;
    const more = task.step();
    if (this.task !== task) return;
    if (more) pending.add(this);
    else {
      this.task = undefined;
      task.done();
    }
  }
  cancel() {
    this.task = undefined;
    pending.delete(this);
    if (!pending.size) {
      generation++;
      if (frame) cancelAnimationFrame(frame);
      if (idle && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle);
      frame = idle = 0;
    }
  }
}
