import { createHost } from "../../../src/runtime/host.js";

export function createHemuHost(opts = {}) {
  const host = createHost(opts);
  const u8 = () => new Uint8Array(host.state.mem.buffer);
  Object.assign(host.env, {
    //HEMU is the machine TempleOS runs on, not a program on Adam: one thread
    //that prints but never spawns, waits or kills (those still throw).
    __task_require() {},
    __host_snd(hz,ns) { host.state.snd?.tone(hz,BigInt.asUintN(64,ns)); },
    __snap_load(base) { opts.snapLoad?.(Number(base), u8()); },
    __present(addr, w, h) { opts.present?.(Number(addr), Number(w), Number(h), u8()); },
    __capture_lock() { return opts.captureLock ? BigInt(!!opts.captureLock()) : 1n; },
    __capture_unlock() { opts.captureUnlock?.(); },
    __host_palette(index, rgb) { opts.palette?.(Number(index), Number(rgb)); },
    __host_disk(lba, count, buf) { opts.diskRead?.(Number(lba), Number(count), u8(), Number(buf)); },
    __host_disk_wr(lba, count, buf) { opts.diskWrite?.(Number(lba), Number(count), u8(), Number(buf)); },
    __host_msx() { return 0n; }, __host_msy() { return 0n; }, __host_msb() { return 0n; }, __host_wheel() { return 0n; },
    __host_key() { return -1n; }, __host_budget() { return 1000000n; }, __host_dt() { return 16n; },
    __host_ns() { return BigInt(host.env.__host_dt())*1000000n; },
    __host_time(idx) {
      const d=new Date(),fields=[d.getSeconds(),d.getMinutes(),d.getHours(),
        d.getDay(),d.getDate(),d.getMonth()+1,d.getFullYear()-2000];
      idx=Number(idx);
      if (idx===-1)
        return fields.reduce((value,n,i)=>value|BigInt(n)<<(8n*BigInt(i)),0n);
      //Saved older engines request individual CMOS registers.
      const field=[0,,1,,2,,3,4,5,6][idx];
      return field===undefined?0n:BigInt(fields[field]);
    },
    __jit_state(_r, _f, _p) { return 0n; }, __jit_compile(_rip) { return 0n; }, __jit_run(rip) { return rip; },
    __jit_x87(_a, _b, _c) {}, __jit_dispatch(_b) { return 0n; }, __jit_chain(_a, _b) {}, __jit_seg(..._a) {},
    __ap_run(_rip, _bud) { return 0n; },
    __bus_poll() {return 1n;},
    __bus_lock() {return 0n;},
    __bus_unlock() {},
  });
  return host;
}

export function CpuFaultText(ex,reported=0) {
  const packed=reported||Number(ex.CpuFault?ex.CpuFault(0n):ex.GuestInfo?.(7n)||0n),reason=packed&255;
  if(reason<2)return "";
  const core=packed>>>8,pc=BigInt.asUintN(64,!reported&&ex.CpuFault?ex.CpuFault(1n):ex.GuestInfo(5n)),
    cause=reason===2?"an unsupported instruction":reason===3?"an integer divide exception that could not be delivered":reason===4?"a native window drawing transaction that did not finish safely":`CPU fault ${reason}`;
  return `CPU ${core} stopped after ${cause}, near 0x${pc.toString(16)}. Restore a working snapshot or restart TempleOS.`;
}
