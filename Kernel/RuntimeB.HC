
U0 PutExcept(Bool catch_it=TRUE)
{
  "Except:%c:\n",Fs->except_ch;
  Fs->catch_except=catch_it;
}

//==================== sound ====================
F64 Ona2Freq(I8 ona)
{//Ona to freq. Ona=60 is 440.0Hz.
  if (!ona)
    return 0;
  else
    return 440.0/32*2.0`(ona/12.0);
}

I8 Freq2Ona(F64 freq)
{//Freq to Ona. 440.0Hz is Ona=60.
  if (freq>0)
    return ClampI64(12*Log2(32.0/440.0*freq),1,I8_MAX);
  else
    return 0;
}

U0 Snd(I8 ona=0)
{//Play ona, a piano key num. 0 means rest.
//The host speaker takes the freq V5.03 gives the PIT.
  __snd(Ona2Freq(ona));
}
U0 Beep(I64 ona=0, I64 busy=0) { __snd(880.0); __sleep(60); __snd(0.0); }
U0 Note(F64 freq, F64 secs=0.2) { __play_note(freq, secs*1000.0); }
U0 MusicSettingsRst() {}
U0 SndTaskEndCB() { __snd(0.0); }

// Play(): minimal music-notation interpreter. Supports octave digits 1-9,
// note letters A-G (with optional # / b), durations w/h/q/e/s/t, '.' dotted,
// and space = rest. The 2nd "lyrics" arg is ignored (printed by caller normally).
I64 play_octave=4;
F64 play_whole_ms=1600.0;
F64 NoteFreq(I64 octave, I64 semitone) {
  // semitone: 0=C .. 11=B ; A4=440. MIDI number = (octave+1)*12 + semitone.
  I64 midi=(octave+1)*12+semitone;
  return 440.0*__pow(2.0,(midi-69)/12.0);
}
U0 Play(U8 *notes, U8 *lyrics=NULL) {
  I64 i=0;
  U8 c;
  F64 dur=play_whole_ms/4.0;
  while (notes[i]) {
    c=notes[i];
    if ('1'<=c<='9') { play_octave=c-'0'; i++; continue; }
    if (c=='w') { dur=play_whole_ms; i++; continue; }
    if (c=='h') { dur=play_whole_ms/2.0; i++; continue; }
    if (c=='q') { dur=play_whole_ms/4.0; i++; continue; }
    if (c=='e') { dur=play_whole_ms/8.0; i++; continue; }
    if (c=='s') { dur=play_whole_ms/16.0; i++; continue; }
    if (c=='t') { dur=play_whole_ms/32.0; i++; continue; }
    if (c==' ') { __sleep(dur); i++; continue; }
    I64 semi=-1;
    if (c=='C') semi=0;
    if (c=='D') semi=2;
    if (c=='E') semi=4;
    if (c=='F') semi=5;
    if (c=='G') semi=7;
    if (c=='A') semi=9;
    if (c=='B') semi=11;
    if (semi<0) { i++; continue; }
    i++;
    if (notes[i]=='#') { semi++; i++; }
    else if (notes[i]=='b') { semi--; i++; }
    __play_note(NoteFreq(play_octave,semi), dur);
  }
  __snd(0.0);
}

//==================== device-context / graphics ====================
