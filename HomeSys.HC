//V5.03 ::/HomeSys.HC. StartUpTasks waits on User (KTask.HC), whose
//UserTaskCont needs ExeCmdLine (A). V5.03 runs StartUpTasks; and its version
//line here, but in the browser the program is the one user task and the
//page is the desktop.

//Place this file in /Home and change
//anything you want.

U0 UserStartUp()
{//Run each time a user a spawned
  DocTermNew;
  Type("::/Doc/Start.DD");
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  WinToTop;
  WinZBufUpdate;
  Dir;
}

U0 SrvStartUp()
{//Run each time a srv task is spawned.
  DocTermNew;
  LBts(&Fs->display_flags,DISPLAYf_SHOW);
  WinToTop;
  WinZBufUpdate;
}
