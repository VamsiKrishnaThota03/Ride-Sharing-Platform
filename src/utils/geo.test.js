import { distanceKm, formatDuration, interpolate } from './geo';

test('distance between Delhi and Hyderabad is about 1,250 km', () => {
  const km = distanceKm([28.6139, 77.209], [17.385044, 78.486671]);
  expect(km).toBeGreaterThan(1200);
  expect(km).toBeLessThan(1300);
});

test('interpolates along the route', () => {
  expect(interpolate([0, 0], [10, 20], 0.5)).toEqual([5, 10]);
});

test('formats durations', () => {
  expect(formatDuration(0.5)).toBe('30 min');
  expect(formatDuration(2)).toBe('2 h');
  expect(formatDuration(1.25)).toBe('1 h 15 min');
});
