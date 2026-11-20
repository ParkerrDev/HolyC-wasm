//Kernel/KHashB.HC: FramePtrAdd, FramePtr, FramePtrSet and FramePtrDel.

U0 FramePtrs()
{
  "%d ",FramePtr("TestFrame");
  FramePtrAdd("TestFrame",5);
  "%d ",FramePtr("TestFrame");
  FramePtrAdd("TestFrame",7);
  "%d ",FramePtr("TestFrame");
  "%d ",FramePtrSet("TestFrame",9);
  "%d ",FramePtr("TestFrame");
  "%d ",FramePtrDel("TestFrame");
  "%d ",FramePtr("TestFrame");
  "%d ",FramePtrDel("TestFrame");
  "%d ",FramePtr("TestFrame");
  "%d\n",FramePtrSet("TestFrame",3);
}

FramePtrs;
