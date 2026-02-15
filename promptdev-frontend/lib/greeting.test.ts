import { greet } from './greeting';

describe('greet', () => {
  it('returns a greeting with the given name', () => {
    expect(greet('World')).toBe('Hello, World!');
    expect(greet('Alice')).toBe('Hello, Alice!');
  });
});
