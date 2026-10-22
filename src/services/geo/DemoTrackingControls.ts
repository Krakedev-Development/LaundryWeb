interface Control {
  pause(): void;
  resume(): void;
  restart(): void;
}
interface State {
  driverId: string;
  paused: boolean;
}
class DemoTrackingControls {
  private controls = new Map<string, Control>();
  private states: State[] = [];
  private listeners = new Set<() => void>();
  snapshot = () => this.states;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify() {
    this.listeners.forEach((listener) => listener());
  }
  register(driverId: string, control: Control) {
    this.controls.set(driverId, control);
    this.states = [
      ...this.states.filter((state) => state.driverId !== driverId),
      { driverId, paused: false },
    ];
    this.notify();
  }
  unregister(driverId: string) {
    this.controls.delete(driverId);
    this.states = this.states.filter((state) => state.driverId !== driverId);
    this.notify();
  }
  execute(driverId: string, action: 'pause' | 'resume' | 'restart') {
    const control = this.controls.get(driverId);
    if (!control) return;
    control[action]();
    this.states = this.states.map((state) =>
      state.driverId === driverId
        ? { driverId, paused: action === 'pause' }
        : state,
    );
    this.notify();
  }
}
export const demoTrackingControls = new DemoTrackingControls();
