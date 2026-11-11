I64 life_op=0;

U0 LifeApply(CDoc *doc,I64 flags=0)
{
  if (flags) throw('Fixture');
  if (life_op) DocBottom(doc);
  else DocTop(doc);
}
