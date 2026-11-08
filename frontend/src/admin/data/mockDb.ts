// TODO: Implement in-memory database with CRUD, filters, search, sort, pagination
// Simulate 300ms latency
export const mockDb = {
  campaigns: {
    getAll: async () => [],
    getById: async (id: string) => null,
    create: async (data: unknown) => null,
    update: async (id: string, data: unknown) => null,
    delete: async (id: string) => null,
  },
  animals: {
    getAll: async () => [],
    getById: async (id: string) => null,
    create: async (data: unknown) => null,
    update: async (id: string, data: unknown) => null,
    delete: async (id: string) => null,
  },
};
