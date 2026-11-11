I64 CommentValue()
{
  /*Outer
    /*Inner /*Deep*/ +9 invalid code */
    +80 invalid code
  */
  return 42;
}

"%d\n",CommentValue;
"%s\n","/* quoted text */";
/*One*/"%d\n",7;/*Two/*Three*/Four*/
"%d\n",11;
/*Native ends the input at EOF, even inside nested comments.
  /*Nested comment closed here.*/
