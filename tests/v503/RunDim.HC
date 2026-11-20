//V5.03 runs an array size's expression as it compiles the declaration
//(Compiler/PrsVar.HC PrsArrayDims), so a size may call a function, as
//Demo/WordSearch.HC sizes its words with MaxI64.
#define DIM_MAX	MaxI64(3,5)

U8 words[4][DIM_MAX+1];

U0 Local()
{
  U8 buf[DIM_MAX+1];
  "%d %d\n",sizeof(buf),sizeof(words);
}

"%d\n",sizeof(words);
Local;
