extern I64 BindingLater(I64 n);
I64 (*binding_forward_ptr)(I64 n)=&BindingLater;

I64 BindingLater(I64 n)
{
  return n;
}

I64 BindingLaterAddress()
{
  return &BindingLater;
}

"ForwardAddress:%d:%d\n",binding_forward_ptr==&BindingLater,
      BindingLaterAddress==&BindingLater;
