//Native entry construction and form navigation over initialized document state.
export const DOC_NAV_SRC=String.raw`
#define DOCF_FORM 0x200
#define DOCf_FORM 9
extern U0 DocFormBwd(CDoc *doc,Bool giveup=FALSE);

U0 DocFormFwd(CDoc *doc,Bool giveup=FALSE)
{
  CDocEntry *doc_e=doc->cur_entry,*doc_e2=doc_e;
  if (doc->flags & DOCF_FORM) {
    if (doc_e==doc) goto ff_recover;
    while (!Bt(doldoc.type_flags_form,doc_e->type_u8) &&
	  !(doc_e->de_flags&DOCEF_LINK) ||
	  doc_e->de_flags&DOCEF_SKIP_IN_FORM) {
      doc_e=doc_e->next;
      if (doc_e==doc) {
ff_recover:
	doc->cur_col=0;
	if (!giveup) {
	  doc->cur_entry=doc_e->last;
	  DocFormBwd(doc,TRUE);
	} else
	  doc->cur_entry=doc;
	return;
      }
    }
  }
  while (doc_e->type_u8==DOCT_INDENT)
    doc_e=doc_e->next;
  if (doc_e!=doc_e2) {
    doc->cur_col=doc_e->min_col;
    doc->cur_entry=doc_e;
  }
}

U0 DocFormBwd(CDoc *doc,Bool giveup=FALSE)
{
  CDocEntry *doc_e=doc->cur_entry,*doc_e2=doc_e;
  if (doc->flags & DOCF_FORM) {
    while (!Bt(doldoc.type_flags_form,doc_e->type_u8) &&
	  !(doc_e->de_flags&DOCEF_LINK) ||
	  doc_e->de_flags&DOCEF_SKIP_IN_FORM) {
      doc_e=doc_e->last;
      if (doc_e==doc) {
	doc->cur_col=0;
	if (!giveup) {
	  doc->cur_entry=doc_e->next;
	  DocFormFwd(doc,TRUE);
	} else
	  doc->cur_entry=doc;
	return;
      }
    }
  }
  while (doc_e->type_u8==DOCT_INDENT)
    doc_e=doc_e->next;
  if (doc_e!=doc_e2) {
    doc->cur_col=doc_e->min_col;
    doc->cur_entry=doc_e;
  }
}

CDocEntry *DocEntryNewBase(CDoc *doc,I64 type,I64 de_flags=0,
	I64 x=0,I64 y=0,I64 page_line_num=0)
{//Allocate a native base entry with document defaults.
  CDocEntry *res=CAlloc(sizeof(CDocEntryBase),doc->mem_task);
  res->type=type;
  res->de_flags=de_flags|doldoc.dft_de_flags[type.u8[0]];
  res->x=x;
  res->y=y;
  res->page_line_num=page_line_num;
  return res;
}
`;
