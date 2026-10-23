import { ProgressiveRender } from './progressive-render';
describe('Renderização progressiva', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('cede um frame entre os pequenos lotes e só conclui ao terminar', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
    vi.stubGlobal('requestIdleCallback', undefined);
    const queue = new ProgressiveRender();
    let created = 0;
    const done = vi.fn();
    queue.run(() => {
      created += 2;
      return created < 8;
    }, done);
    expect(created).toBe(0);
    expect(done).not.toHaveBeenCalled();
    let iterations = 0;
    while (frames.size && iterations++ < 30) {
      const [frame, callback] = [...frames][0];
      frames.delete(frame);
      const previous = created;
      callback(0);
      expect(created - previous).toBeLessThanOrEqual(2);
    }
    expect(created).toBe(8);
    expect(done).toHaveBeenCalledOnce();
  });
  it('divide o orçamento entre listas simultâneas em vez de montar todas no mesmo frame', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame));
    vi.stubGlobal('requestIdleCallback', undefined);
    const a = new ProgressiveRender();
    const b = new ProgressiveRender();
    let first = 0,
      second = 0;
    a.run(
      () => {
        first += 2;
        return first < 20;
      },
      () => {},
    );
    b.run(
      () => {
        second += 2;
        return second < 20;
      },
      () => {},
    );
    let iterations = 0;
    while (frames.size && iterations++ < 50) {
      const [frame, callback] = [...frames][0];
      frames.delete(frame);
      const previous = first + second;
      callback(iterations * 16);
      expect(first + second - previous).toBeLessThanOrEqual(2);
    }
    expect(first).toBe(20);
    expect(second).toBe(20);
  });
  it('cancela a criação pendente quando a lista é substituída ou destruída', () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('requestIdleCallback', undefined);
    const queue = new ProgressiveRender();
    const step = vi.fn(() => false);
    const done = vi.fn();
    queue.run(step, done);
    queue.cancel();
    for (let index = 0; index < frames.length && index < 10; index++) frames[index](0);
    expect(step).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });
});
