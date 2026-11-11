I64 later=12;
#define VALUE later

U0 Before()
{
  "%d\n",VALUE;
}

"%d\n",later;
#define later 999

U0 After()
{
  "%d\n",VALUE;
}

"%d\n",later;
Before;
After;
