//Spawn hands its data's bits to an F64 argument.
F64 got=0;
U0 Rot(F64 d)
{
  got=d;
}
Spawn(&Rot,(-pi/32)(I64));
Sleep(20);
"d %9.6f\n",got;
