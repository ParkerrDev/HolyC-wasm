const CP437="ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";

export function ByteString(source)
{
  if (typeof source==="string") return source;
  if (source instanceof ArrayBuffer) source=new Uint8Array(source);
  if (!(source instanceof Uint8Array))
    throw new TypeError("HolyC source must be a byte string or Uint8Array");
  let text="";
  for (let i=0;i<source.length;i+=8192)
    text+=String.fromCharCode(...source.subarray(i,i+8192));
  return text;
}

export function Identifier(source)
{//CP437 bytes and Unicode Greek names have the same symbol identity.
  return Array.from(source,ch=>{
    const code=ch.charCodeAt(0);
    return code>=128 && code<=255?CP437[code-128]:ch;
  }).join("");
}

export function CharByte(ch)
{
  const code=ch.charCodeAt(0);
  if (code<=255) return code;
  const index=CP437.indexOf(ch);
  if (index>=0) return index+128;
  throw new Error("Character is not in TempleOS CP437: "+JSON.stringify(ch));
}
