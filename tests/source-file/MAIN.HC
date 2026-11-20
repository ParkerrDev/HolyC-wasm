//A BP link copies a bin of another document, by tag or number.
//$SP,"",BI=5,BP="C:/ORACLE/LINKED.HC.Z,Mark"$
//$SP,"",BI=6,BP="C:/ORACLE/LINKED.HC,1"$
U8 *a=$IB,"",BI=5$,*b=$IB,"",BI=6$;

"%d %d %d %d\n",$IS,"",BI=5$,a[1],$IS,"",BI=6$,b[1];
"%s|%s|%d|%d\n",__DIR__,__FILE__,__LINE__,__CMD_LINE__;
#include "C:/ORACLE/INC.HC"
