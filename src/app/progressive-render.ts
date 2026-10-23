// Keep each DOM update small, yielding to input and a paint between batches.
export class ProgressiveRender {
  private generation = 0;
  private frame = 0;
  private idle = 0;
  run(step: () => boolean, done: () => void) {
    this.cancel();
    const generation = this.generation;
    const next = () => {
      if (generation !== this.generation) return;
      const render = () => {
        if (generation !== this.generation) return;
        this.frame = requestAnimationFrame(() => {
          if (generation !== this.generation) return;
          if (step()) next();
          else done();
        });
      };
      if (typeof window.requestIdleCallback === 'function')
        this.idle = window.requestIdleCallback(render, { timeout: 150 });
      else this.frame = requestAnimationFrame(render);
    };
    this.frame = requestAnimationFrame(next);
  }
  cancel() {
    this.generation++;
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.idle && typeof window.cancelIdleCallback === 'function')
      window.cancelIdleCallback(this.idle);
    this.frame = 0;
    this.idle = 0;
  }
}
