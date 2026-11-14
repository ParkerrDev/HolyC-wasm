I64 settings_draws=0,settings_ticks=0,settings_ends=0;

U0 SettingsDraw(CTask *,CDC *dc)
{
  dc->color=RED;
  GrRect(dc,3,4,5,6);
  settings_draws++;
}

U0 SettingsEnd()
{
  settings_ends++;
}

U0 SettingsTick(I64)
{
  while (TRUE) {
    settings_ticks++;
    Sleep(1);
  }
}

U0 SettingsCheck(Bool good)
{
  if (!good) throw('Settings');
}

I64 SettingsTest()
{
  I64 left=Fs->win_left,right=Fs->win_right,top=Fs->win_top,
	bottom=Fs->win_bottom,attr=Fs->text_attr,inhibit=Fs->win_inhibit,
	draws,ticks;
  U8 *old_dir=DirCur,*new_dir;
  CTask *old_animate,*old_song,*animate,*song;
  CTaskSettings *outer;
  settings_draws=settings_ticks=settings_ends=0;
  old_animate=Fs->animate_task=Spawn(&SettingsTick,NULL,"OldAnim",,Fs);
  old_song=Fs->song_task=Spawn(&SettingsTick,NULL,"OldSong",,Fs);
  Fs->draw_it=&SettingsDraw;
  Fs->task_end_cb=&SettingsEnd;
  outer=SettingsPush;
  SettingsCheck(Fs->next_settings==outer && !outer->next);
  SettingsCheck(!Fs->animate_task && !Fs->song_task);
  SettingsCheck(Bt(&old_animate->task_flags,TASKf_SUSPENDED) &&
	Bt(&old_song->task_flags,TASKf_SUSPENDED));
  WinHorz(2,40);WinVert(3,20);
  Fs->scroll_x=11;Fs->scroll_y=22;Fs->scroll_z=33;
  Fs->text_attr=0x42;Fs->win_inhibit=0;
  Fs->task_end_cb=NULL;
  DirMk("SettingsTmp");Cd("SettingsTmp");
  animate=Fs->animate_task=Spawn(&SettingsTick,NULL,"Animate",,Fs);
  song=Fs->song_task=Spawn(&SettingsTick,NULL,"Song",,Fs);
  while (settings_draws<2 || settings_ticks<2) Sleep(1);
  SettingsPush(,TSF_SAME_SONG);
  SettingsCheck(Fs->song_task==song && !Fs->animate_task);
  SettingsPop(,TSF_SAME_SONG);
  SettingsCheck(Fs->song_task==song && Fs->animate_task==animate);
  SettingsPop;
  while (TaskValidate(animate) || TaskValidate(song)) Yield;
  SettingsCheck(!Fs->next_settings && Fs->animate_task==old_animate &&
	Fs->song_task==old_song && Fs->draw_it==&SettingsDraw &&
	Fs->task_end_cb==&SettingsEnd);
  SettingsCheck(Fs->win_left==left && Fs->win_right==right &&
	Fs->win_top==top && Fs->win_bottom==bottom &&
	Fs->text_attr==attr && Fs->win_inhibit==inhibit);
  new_dir=DirCur;
  SettingsCheck(!StrCmp(new_dir,old_dir));Free(new_dir);Free(old_dir);
  SettingsCheck(!Bt(&old_animate->task_flags,TASKf_SUSPENDED) &&
	!Bt(&old_song->task_flags,TASKf_SUSPENDED));
  draws=settings_draws;ticks=settings_ticks;
  while (settings_draws==draws || settings_ticks==ticks) Sleep(1);
  Fs->draw_it=NULL;Fs->task_end_cb=NULL;
  Kill(old_animate);Kill(old_song);
  Fs->animate_task=Fs->song_task=NULL;
  SettingsCheck(!settings_ends);
  SettingsPop;
  return 1;
}
