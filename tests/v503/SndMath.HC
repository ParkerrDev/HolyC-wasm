U0 SndMath()
{
  I64 i;
  F64 t;
  for (i=-3;i<=5;i++) {
    t=i*0.3;
    "%0.3f %0.3f %0.3f %0.3f %0.3f %0.3f\n",Saw(t,1.0),FullSaw(t,1.0),
	  Caw(t,1.0),FullCaw(t,1.0),Tri(t,1.0),FullTri(t,1.0);
  }
  "%0.3f %0.3f\n",Tri(1.0,0.0),FullCaw(1.0,0.0);
  for (i=0;i<12;i++)
    "%d %d %d\n",Note2Ona(i,i%8),Ona2Note(i*9),Ona2Octave(i*9);
  for (i=0;i<88;i+=13)
    "%d %0.3f %d\n",i,Ona2Freq(i),Freq2Ona(1.02*Ona2Freq(i));
}

SndMath;
