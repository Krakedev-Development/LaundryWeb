import type { DriverLocation, DriverLocationPublisher } from './geo.types';

/** Writes only to the current demo's central repository, never to another app. */
export class MockDriverLocationPublisher implements DriverLocationPublisher {
  private driverId?: string;
  constructor(private write: (location: DriverLocation) => void) {}
  async start(driverId: string) {
    this.driverId = driverId;
  }
  async stop() {
    this.driverId = undefined;
  }
  async publish(location: DriverLocation) {
    if (location.driverId === this.driverId) this.write(location);
  }
}
