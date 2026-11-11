//case 1...3: is a range, with or without spaces.

U0 CaseRange()
{
  I64 i;
  for (i=0;i<7;i++)
    switch (i) {
      case 1...3:
	"r";
	break;
      case 4 ... 5:
	"s";
	break;
      default:
	"d";
    }
  '\n';
  for (i='a';i<='e';i++)
    switch (i) {
      case 'a'...'c':
	"%c",i;
	break;
      default:
	"-";
    }
  '\n';
}

CaseRange;
