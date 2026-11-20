//CBlkPool.used_u8s follows alloced_u8s in Kernel/Heap.HH. Freed blocks may
//stay on a task's size lists, so the arena's end cannot measure a leak.
export function heapUsed(host) {
  const pool=host.heap.pool();
  return new DataView(host.state.mem.buffer).getBigInt64(Number(pool)+8,true);
}
