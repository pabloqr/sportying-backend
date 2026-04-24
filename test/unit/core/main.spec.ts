//--------------------------------------------------------------------------------------------------------------------//
// Test suite
//--------------------------------------------------------------------------------------------------------------------//

describe('main bootstrap', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates the application, configures validation and starts listening', async () => {
    const useGlobalPipes = jest.fn();
    const listen = jest.fn().mockResolvedValue(undefined);
    const create = jest.fn().mockResolvedValue({
      useGlobalPipes,
      listen,
    });

    jest.doMock('@nestjs/core', () => ({
      NestFactory: { create },
    }));

    await jest.isolateModulesAsync(async () => {
      await import('../../../src/main.js');
      await Promise.resolve();
    });

    expect(create).toHaveBeenCalledWith(expect.any(Function), { cors: true });
    expect(useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(expect.anything(), '0.0.0.0');
  });
});
