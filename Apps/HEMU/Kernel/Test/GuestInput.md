# Guest pointer delivery

Keep button transitions and their positions until TempleOS has completed a
whole window-manager cycle. A host frame is only a CPU budget and need not run
the guest's mouse consumer. Two advances of `winmgr.updates` span a complete
poll/handler cycle regardless of where the first budget stopped. This also
works in the native menu and Ctrl-drag loops, which do not update `ms_last`.

- `GuestInput.accept` overwrote a down with an up received before a CPU budget.
- Native GUI tests held buttons for 150 ms, concealing ordinary short clicks.
- Relative motion must still start from the guest cursor so a game's `MsSet`
  recentering is respected. A queued delta is applied once, not every budget.
- Reset cancels pending presses and releases buttons. Saved machines retain
  pending transitions; snapshots made before the queue existed have none.

Checks cover multiple clicks received between guest polls, stopped/slow guest
updates, original edge positions, relative recentering, reset and restoration.
The worker check delivers a down and up in one host message batch and observes
the messages received by an actual TempleOS task, on one and four cores.

Validated against the production worker with both one and four cores. The old
`GuestInput.js`, loaded only into an isolated test process, loses all four
batched transitions and fails the native message assertion. The new bridge
passes, including the native Ctrl-drag release.

```sh
HEMU_ROOT=/path/to/HEMU node Apps/HEMU/Kernel/Test/GuestInput.test.mjs
HEMU_ROOT=/path/to/HEMU node Apps/HEMU/Kernel/Test/WorkerInput.test.mjs
```
