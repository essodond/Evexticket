import { describe, expect, it } from 'vitest';
import { zoomMapRegion } from './mapRegion';

const region = {
  latitude: 6.13,
  longitude: 1.22,
  latitudeDelta: 2,
  longitudeDelta: 4,
};

describe('zoomMapRegion', () => {
  it('zooms in without moving the map center', () => {
    expect(zoomMapRegion(region, 1)).toEqual({
      ...region,
      latitudeDelta: 1,
      longitudeDelta: 2,
    });
  });

  it('zooms out and clamps provider-supported bounds', () => {
    const zoomedOut = zoomMapRegion({
      ...region,
      latitudeDelta: 100,
      longitudeDelta: 100,
    }, -1);

    expect(zoomedOut.latitudeDelta).toBe(120);
    expect(zoomedOut.longitudeDelta).toBe(180);
  });

  it('never zooms closer than the minimum visible region', () => {
    const zoomedIn = zoomMapRegion({
      ...region,
      latitudeDelta: 0.0005,
      longitudeDelta: 0.0005,
    }, 1);

    expect(zoomedIn.latitudeDelta).toBe(0.0005);
    expect(zoomedIn.longitudeDelta).toBe(0.0005);
  });
});
