#help_index "Snd/Music"

public class CMusicGlbls
{
  U8	*cur_song;
  CTask	*cur_song_task;
  I64	octave;
  F64	note_len;
  U8	note_map[7];
  Bool	mute;
  I64	meter_top,meter_bottom;
  F64	tempo,stacatto_factor;

  //If you wish to sync with a
  //note in a Play() string.  0 is the start
  I64	play_note_num;

  F64	tM_correction,last_Beat,last_tM;
} music={NULL,NULL,4,1.0,{0,2,3,5,7,8,10},FALSE,4,4,2.5,0.9,0,0,0,0};

#help_index "Snd/Music;Time/Seconds"
public F64 tM()
