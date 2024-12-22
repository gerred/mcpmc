import { jest } from '@jest/globals';

jest.mock('mineflayer', () => ({
  createBot: jest.fn(),
}));

jest.mock('vec3', () => {
  const mockVec3 = function(x: number, y: number, z: number) {
    return {
      x, y, z,
      distanceTo: function(other: any) {
        return Math.sqrt(
          Math.pow(this.x - other.x, 2) + 
          Math.pow(this.y - other.y, 2) + 
          Math.pow(this.z - other.z, 2)
        );
      },
      equals: function(other: any) {
        return this.x === other.x && 
               this.y === other.y && 
               this.z === other.z;
      }
    };
  };
  return { Vec3: mockVec3 };
});
