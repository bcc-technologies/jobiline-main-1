import deepResolvePromises from './deep-resolver';

describe('deepResolvePromises', () => {
  it('should resolve nested promises in objects and arrays', async () => {
    const input = {
      name: Promise.resolve('jobbi'),
      tags: [Promise.resolve('api'), 'ready'],
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    await expect(deepResolvePromises(input)).resolves.toEqual({
      name: 'jobbi',
      tags: ['api', 'ready'],
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('should leave primitives unchanged', async () => {
    await expect(deepResolvePromises(42)).resolves.toBe(42);
    await expect(deepResolvePromises('ok')).resolves.toBe('ok');
    await expect(deepResolvePromises(null)).resolves.toBeNull();
  });
});
