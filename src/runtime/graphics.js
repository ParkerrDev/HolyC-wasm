import { PALETTE, GR_WIDTH, GR_HEIGHT } from "./palette.js";

export class Framebuffer {
  constructor(ctx, width = GR_WIDTH, height = GR_HEIGHT, scale = 1, indicesBuf = null, paletteBuf = null) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.ctx = ctx;
    this.indices = indicesBuf || new Uint8Array(width * height);
    this.image = ctx ? ctx.createImageData(width, height) : { data: new Uint8ClampedArray(width * height * 4), width, height };
    this.pal32 = paletteBuf || new Uint32Array(256);
    if(this.pal32.length!==256)throw new RangeError('A VGA palette needs 256 entries.');
    this.pal32.fill(0xff000000);
    for (let i = 0; i < 16; i++) {
      const [r, g, b] = PALETTE[i];
      this.pal32[i] = (255 << 24) | (b << 16) | (g << 8) | r;
    }
    this.indices.fill(0);
  }

  palette(index,bgr48) {
    const r=Number((bgr48>>40n)&255n),g=Number((bgr48>>24n)&255n),b=Number((bgr48>>8n)&255n);
    Atomics.store(this.pal32,index&255,0xff000000|(b<<16)|(g<<8)|r);
  }

  inBounds(x, y) { return x >= 0 && x < this.width && y >= 0 && y < this.height; }

  plot(x, y, color) {
    x |= 0; y |= 0;
    if (this.inBounds(x, y)) this.indices[y * this.width + x] = color & 15;
  }

  present() {
    if (!this.ctx) return;
    const data = new Uint32Array(this.image.data.buffer);
    const idx = this.indices, pal = this.pal32;
    for (let i = 0; i < idx.length; i++) data[i] = pal[idx[i]&15];
    if (this.scale === 1) {
      this.ctx.putImageData(this.image, 0, 0);
    } else {
      if (!this._tmp) {
        this._tmp = (typeof OffscreenCanvas !== "undefined")
          ? new OffscreenCanvas(this.width, this.height)
          : null;
        this._tmpctx = this._tmp ? this._tmp.getContext("2d") : null;
      }
      if (this._tmpctx) {
        this._tmpctx.putImageData(this.image, 0, 0);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.drawImage(this._tmp, 0, 0, this.width * this.scale, this.height * this.scale);
      } else {
        this.ctx.putImageData(this.image, 0, 0);
      }
    }
  }
}
