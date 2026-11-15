let root=new URL("../../../../",import.meta.url);
if (typeof process!="undefined" && process.versions?.node) {
  const {existsSync}=await import("node:fs"),{resolve}=await import("node:path"),
    {pathToFileURL}=await import("node:url");
  let path=process.env.HEMU_ROOT;
  if (!path && process.env.HEMU_SRC) path=resolve(process.env.HEMU_SRC,"..");
  if (!path) path=[".","hemu",new URL("../../../../HEMU/",import.meta.url).pathname]
    .find(path=>existsSync(resolve(path,"Kernel/Cpu.HC")));
  if (!path) throw Error("Set HEMU_ROOT to the HEMU checkout (containing Kernel/Cpu.HC).");
  root=pathToFileURL(resolve(path)+"/");
}
export const HemuPath=path=>new URL(path,root);
