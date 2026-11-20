//V5.03 Adam/DolDoc/MakeDoc.HC lines 16-34: hash types, CDolDocGlbls and
//BIBLE_FILENAME. Its #includes are the DolDoc lists in src/compiler.js.

//Hash Types
#define DHT_DOC_CMD	1
#define DHT_DOC_FLAG	2
#define DHT_COLOR	4

public class CDolDocGlbls
{
  CHashTable *hash;
  I64	dft_de_flags		[DOCT_TYPES_NUM],
	type_flags_nontag_invis [(DOCT_TYPES_NUM+63)/64],
	type_flags_form		[(DOCT_TYPES_NUM+63)/64],
	type_flags_data		[(DOCT_TYPES_NUM+63)/64],
	type_flags_chk_dup	[(DOCT_TYPES_NUM+63)/64],
	clean_scan_codes	[4];
  I32	dft_type_flags		[DOCT_TYPES_NUM];
} doldoc;
//His MemSet(&doldoc,0,sizeof(CDolDocGlbls)); is left out: doldoc starts
//zeroed, and a prelude statement runs after DocInit, the initializer.

#help_index "God"
#define BIBLE_FILENAME	"::/Misc/Bible.TXT.Z"
