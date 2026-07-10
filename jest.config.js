// SPEC-070-B P0 (AC-27). RN's entire CI was `npm install` + `tsc`; there was no jest, no `test`
// script, and a CI comment claiming the fixture suite "already executes". It did not.
module.exports = {
  preset: 'react-native',
  testEnvironment: 'node',
  // No global react-native mock: each suite owns its own, because the shape of the mock IS part of
  // what the suite asserts. A shared mock here would be a second source of truth, and jest.mock in a
  // test file silently wins over one in setup — a trap worth not building.
  testMatch: ['<rootDir>/__tests__/**/*.test.ts', '<rootDir>/src/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  // The facade is the unit under test; the native module is mocked in jest.setup.js. A jest test
  // therefore proves the BRIDGE CONTRACT (method name, argument shape) and nothing about native.
  // AC-24 makes the fixture runner assert against `expect`, not the call shape — but even then, the
  // envelope and the `framework` tag are unreachable from here. That is AC-2's job, on a device.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  clearMocks: true,
};
