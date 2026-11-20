
CDC gr_dc_storage,gr_dc2_storage;
U8 gr_scrn_bitmap[GR_WIDTH*GR_HEIGHT],gr_scrn_bitmap2[GR_WIDTH*GR_HEIGHT];
U32 gr_text_base[TEXT_ROWS*TEXT_COLS];
I64 gr_to_8_bits[256],gr_to_8_colors[256]; //V5.03 GrInit2's MAlloc, as storage.
I64 gr_scrn_r[16],gr_scrn_r2[16];

