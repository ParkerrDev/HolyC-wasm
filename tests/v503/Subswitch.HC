I64 Subswitch(I64 n)
{
  I64 res=0,i;
  switch (n) {
    case 0:
      res=9;
    start:
      res=res*10+1;
      case 1:
	res=res*10+2;
	break;
      case 2:
	res=res*10+3;
      start:
	res=res*10+4;
	case 3:
	  res=res*10+5;
	  break;
	case 4:
	  for (i=0;i<3;i++) {
	    res=res*10+6;
	    if (i==1) break;
	  }
	  break;
      end:
	res=res*10+7;
	break;
    end:
      res=res*10+8;
      break;
    start:
      res=res*10+3;
      case 5:
	res=res*10+4;
	break;
      default:
	res=res*10+5;
	break;
    end:
      res=res*10+9;
      break;
  }
  return res;
}

I64 SubJump(I64 n)
{
  I64 res=0;
  switch (n) {
    start:
      res=3;
      case 0:
	goto sj_exit;
      case 1:
	try {
	  res=res*10+4;
	} catch Fs->catch_except=TRUE;
	break;
      case 2:
	return 77;
    end:
      res=res*10+5;
      break;
  }
sj_exit:
  return res;
}

I64 i;
for (i=-1;i<7;i++) "%d %d\n",i,Subswitch(i);
for (i=0;i<4;i++) "%d %d\n",i,SubJump(i);
for (i=0;i<5;i++)
  switch (i) {
    start:
      "[";
      case 1:
	"One";
	break;
      case 3:
	"Three";
	break;
    end:
      "]";
      break;
    default:
      "-";
  }
"\n";
