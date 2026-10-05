import { operationalStage } from '../fulfillment';
import {
  MockTrackingProvider,
  demoTrackingRoute,
} from './MockTrackingProvider';
import { routingService } from './index';
import { geoConfig } from './geo.config';
import { MockDriverLocationPublisher } from './MockDriverLocationPublisher';
import type { Driver, Facility, Order } from '../../types';
export class WebMockTracking {
  private provider = new MockTrackingProvider(geoConfig.trackingIntervalMs);
  private active = new Map<
    string,
    { key: string; controller: AbortController; unsubscribe?: () => void }
  >();
  reconcile(
    orders: Order[],
    drivers: Driver[],
    facilities: Facility[],
    publish: (
      id: string,
      coordinates: Driver['location'],
      updatedAt: string,
    ) => void,
  ) {
    if (geoConfig.trackingMode !== 'mock') {
      this.active.forEach((_, id) => this.stop(id));
      return;
    }
    const needed = new Set<string>();
    orders
      .filter((o) =>
        [
          'HEADING_TO_PICKUP',
          'OUT_FOR_DELIVERY',
          'HEADING_TO_FACILITY',
        ].includes(operationalStage(o)),
      )
      .forEach((order) => {
        const id =
          operationalStage(order) === 'OUT_FOR_DELIVERY'
            ? order.delivery.driverId
            : order.pickup.driverId;
        const driver = drivers.find((d) => d.id === id);
        if (!id || !driver || needed.has(id)) return;
        const destination =
          operationalStage(order) === 'HEADING_TO_FACILITY'
            ? facilities.find((f) => f.id === order.facilityId)?.coordinates
            : operationalStage(order) === 'OUT_FOR_DELIVERY'
              ? order.deliveryAddress.coordinates
              : order.customerAddress.coordinates;
        if (!destination) return;
        needed.add(id);
        const key = order.id + ':' + operationalStage(order);
        if (this.active.get(id)?.key === key) return;
        this.stop(id);
        const controller = new AbortController();
        this.active.set(id, { key, controller });
        routingService
          .getRoute(driver.location, destination, { signal: controller.signal })
          .catch(() => demoTrackingRoute(driver.location, destination))
          .then((route) => {
            if (controller.signal.aborted) return;
            this.provider.start(
              id,
              route ?? demoTrackingRoute(driver.location, destination),
            );
            const publisher = new MockDriverLocationPublisher((location) =>
              publish(
                id,
                { ...driver.location, ...location.coordinates },
                location.updatedAt,
              ),
            );
            void publisher.start(id);
            const unsubscribe = this.provider.subscribeToDriver(
              id,
              (location) => {
                void publisher.publish(location);
              },
            );
            const current = this.active.get(id);
            if (current)
              current.unsubscribe = () => {
                unsubscribe();
                void publisher.stop();
              };
          });
      });
    this.active.forEach((_, id) => {
      if (!needed.has(id)) this.stop(id);
    });
  }
  private stop(id: string) {
    const state = this.active.get(id);
    state?.controller.abort();
    state?.unsubscribe?.();
    this.provider.stop(id);
    this.active.delete(id);
  }
  dispose() {
    this.active.forEach((_, id) => this.stop(id));
    this.provider.dispose();
  }
}
