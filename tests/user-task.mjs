import assert from 'node:assert/strict';
import {compileHolyC} from '../src/compiler.js';
import {createTaskHost,taskSupport,USER_EXPORTS} from '../src/runtime/tasks.js';
import {Framebuffer} from '../src/runtime/graphics.js';

//A program run as a user task's cmd line (createTaskHost({user:true})) gets
//V5.03's layout: Adam serving jobs, the Window Mgr at the bottom of the win
//stack, and a user task with a term doc (UserStartUp's DocTermNew) that the
//Window Mgr draws, $BG$ and all. The caller links TaskHostUser by exporting
//USER_EXPORTS; the run keeps the entry's result.
assert(taskSupport(),'user task checks require actual JSPI');
const deadline=setTimeout(()=>{throw new Error('HolyC user task checks did not settle');},20000);
const source=`
I64 UserChk()
{
  I64 res=0;
  if (Fs->put_doc && Fs->put_doc==Fs->display_doc) res|=1;
  if (sys_winmgr_task!=adam_task && TaskValidate(sys_winmgr_task)) res|=2;
  if (Fs->win_inhibit==WIG_USER_TASK_DFT) res|=4;
  if (Fs!=adam_task && Fs->parent_task==adam_task) res|=16;
  if (Adam("Fs==adam_task;")) res|=32;
  if (sys_winmgr_task!=Fs && Bt(&sys_winmgr_task->display_flags,DISPLAYf_SHOW)) res|=8;
  DocClear;
  Fs->text_attr=YELLOW<<4+BLUE;
  "$$BG,LTCYAN$$\\n\\n\\n";
  Refresh(2);
  return res;
}
`;
const result=compileHolyC(source,{filename:'User.HC',lenient:false,exports:['UserChk',...USER_EXPORTS]});
const module=new WebAssembly.Module(result.bytes);
const bare=new WebAssembly.Module(compileHolyC(source,{filename:'User.HC',lenient:false,exports:['UserChk']}).bytes);
function run(user) {
  const fb=new Framebuffer(null);fb.flip??=()=>{};
  let text='';
  const host=createTaskHost({user,gfx:fb,ansi:false,jit:result.jit,onText:s=>{text+=s;}});
  host.attach(new WebAssembly.Instance(module,{env:host.env}));
  const cell=(row,col)=>fb.indices[(row*8+4)*fb.width+col*8+4];
  return {host,fb,cell,text:()=>text};
}
const user=run(true);
assert.equal(await user.host.run('UserChk'),63n);
assert.equal(user.text(),'','a user task prints into its doc');
//WinMax'd, as V5.03's Start.HC runs a game: the doc starts on screen row 2,
//under its border, and row 0 is the Window Mgr's.
for(const row of [0,1,2]) assert.equal(user.cell(2+row,40),11,'LTCYAN doc row '+row);
assert.notEqual(user.cell(0,40),11,'screen row 0 is not the doc');
assert.equal(user.cell(20,40),14,'the YELLOW text_attr below the doc');
await user.host.dispose();

const plain=run(false);
assert.equal(await plain.host.run('UserChk'),32n,'without user the program is Adam, whose Adam() runs its job at once');
assert.equal(plain.text(),'\n\n\n','without user the host console has the text');
await plain.host.dispose();

const unlinked=createTaskHost({user:true});
unlinked.attach(new WebAssembly.Instance(bare,{env:unlinked.env}));
assert.throws(()=>unlinked.run('UserChk'),/exports TaskHostUser/);
await unlinked.dispose().catch(()=>{});
clearTimeout(deadline);
console.log('User task: Adam serves its jobs, the Window Mgr under a term task whose doc it draws ($BG$ rows), plain runs unchanged, an unlinked TaskHostUser refused.');
