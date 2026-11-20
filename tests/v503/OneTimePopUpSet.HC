//OneTimePopUp shows nothing and returns FALSE once its flag is set.
I64 flags[1]={0x5};
"%d\n",OneTimePopUp(flags,0,"Not shown.");
"%d\n",OneTimePopUp(flags,2,NULL);
"0x%X\n",flags[0];
