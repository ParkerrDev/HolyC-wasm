U0 Main()
{//A menu's arguments are expressions its Lex hands the compiler.
  CMenuEntry *tmpme,*tmpse;
  CMenu *m=MenuPush(
	"File {\n"
	"  Abort(,CH_SHIFT_ESC);\n"
	"  Exit(,CH_ESC);\n"
	"}\n"
	"Play {\n"
	"  Restart(,'\\n');\n"
	"  Left(,,SC_CURSOR_LEFT|SCF_CTRL);\n"
	"  Two(MSG_KEY_DOWN,'2');\n"
	"}\n");
  for (tmpme=m->sub;tmpme;tmpme=tmpme->next)
    for (tmpse=tmpme->sub;tmpse;tmpse=tmpse->next)
      "%s %X %X %X\n",tmpse->name,tmpse->msg_code,tmpse->arg1,tmpse->arg2;
  MenuPop;
}

Main;
