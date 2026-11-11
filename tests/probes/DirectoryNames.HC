U0 DirectoryNames()
{
  U8 name[40];
  I64 ch,len;
  U64 hash=1469598103934665603;
  for (ch=0;ch<256;ch++)
    for (len=1;len<40;len++) {
      MemSet(name,'A',len);
      name[len]=0;
      name[len/2]=ch;
      hash=(hash^FileNameChk(name))*1099511628211;
    }
  hash=(hash^FileNameChk("."))*1099511628211;
  hash=(hash^FileNameChk(".."))*1099511628211;
  hash=(hash^FileNameChk(NULL))*1099511628211;
  "Names:%016X\n",hash;
}

DirectoryNames;
