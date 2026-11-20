import assert from "node:assert/strict";
import {GuestHarness} from "./GuestHarness.mjs";

//The host calls __main once a frame. Booted, a frame allocates nothing from
//the engine's own heap: the runtime's prelude statements (its boot) run once,
//not every frame. When they ran every frame, Adam/Win.HC's winmgr.t CAlloc
//and GrPalette.HC's DefineLstLoad leaked until MAlloc threw 'OutMem'.
const h=await GuestHarness(),FRAMES=300,before=h.Allocs();
await h.Run(FRAMES);
assert.equal(h.Allocs()-before,0,"The engine allocated in "+FRAMES+" booted frames.");
console.log("Frame heap: no engine allocation in "+FRAMES+" frames.");
