module.exports = {
  setupFilesAfterEnv: ['./jest/setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  watchman: false,
  roots: ['src'],
  globals: {},
};
