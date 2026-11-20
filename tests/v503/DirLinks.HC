//Dir with no match lists nothing and counts 0.
"%d\n",Dir("NoSuchFile*");
"%d\n",Dir("NoSuchFile*",TRUE);
PutFileLink(NULL);
PutDirLink(NULL);
"End\n";
