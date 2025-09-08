import io
import struct
import zlib

TILE_BASE_PATH = r"C:\Users\ralaya\Documents\gis\projects\wsr88-coverage-app\frontend\public\data\nexrad_coverages"

COLOR_MAP = {
    "purple": (82, 82, 182),
    "green": (82, 182, 82),
    "yellow": (255, 222, 32),
    "gray":  (111, 111, 111),
}

def read_chunk(f):
    length_data = f.read(4)
    if not length_data:
        return None, None, None
    length = struct.unpack(">I", length_data)[0]
    chunk_type = f.read(4)
    data = f.read(length)
    crc = f.read(4)
    return chunk_type, data, crc

def write_chunk(f, chunk_type, data):
    f.write(struct.pack(">I", len(data)))
    f.write(chunk_type)
    f.write(data)
    crc = zlib.crc32(chunk_type)
    crc = zlib.crc32(data, crc)
    f.write(struct.pack(">I", crc & 0xffffffff))

def apply_png_filter_reverse(filter_type, current_row, previous_row, bytes_per_pixel):
    """Reverse PNG filtering to get actual pixel values"""
    if filter_type == 0:  # None
        return current_row
    elif filter_type == 1:  # Sub
        for i in range(bytes_per_pixel, len(current_row)):
            current_row[i] = (current_row[i] + current_row[i - bytes_per_pixel]) & 0xFF
    elif filter_type == 2:  # Up
        if previous_row:
            for i in range(len(current_row)):
                current_row[i] = (current_row[i] + previous_row[i]) & 0xFF
    elif filter_type == 3:  # Average
        for i in range(len(current_row)):
            left = current_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
            up = previous_row[i] if previous_row else 0
            current_row[i] = (current_row[i] + ((left + up) // 2)) & 0xFF
    elif filter_type == 4:  # Paeth
        for i in range(len(current_row)):
            left = current_row[i - bytes_per_pixel] if i >= bytes_per_pixel else 0
            up = previous_row[i] if previous_row else 0
            upper_left = previous_row[i - bytes_per_pixel] if previous_row and i >= bytes_per_pixel else 0
            
            p = left + up - upper_left
            pa = abs(p - left)
            pb = abs(p - up)
            pc = abs(p - upper_left)
            
            if pa <= pb and pa <= pc:
                predictor = left
            elif pb <= pc:
                predictor = up
            else:
                predictor = upper_left
                
            current_row[i] = (current_row[i] + predictor) & 0xFF
    
    return current_row

def recolor_png(input_path, target_color_str):
    if target_color_str not in COLOR_MAP:
        raise ValueError(f"Unsupported color: {target_color_str}")
    target_rgb = COLOR_MAP[target_color_str]

    with open(input_path, 'rb') as f:
        signature = f.read(8)
        if signature != b'\x89PNG\r\n\x1a\n':
            raise ValueError("Not a valid PNG file")

        chunks = []
        ihdr = None
        idat_data = b""

        while True:
            chunk_type, data, crc = read_chunk(f)
            if chunk_type is None:
                break
            if chunk_type == b'IHDR':
                ihdr = data
            elif chunk_type == b'IDAT':
                idat_data += data # type: ignore
            else:
                chunks.append((chunk_type, data))

    width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", ihdr) # type: ignore

    if bit_depth != 8 or color_type != 6:
        raise NotImplementedError("Only 32-bit RGBA PNGs are supported (bit depth 8, color type 6)")

    decompressed = zlib.decompress(idat_data)
    print(len(decompressed) / 4.0)

    stride = width * 4
    new_data = bytearray()
    i = 0
    previous_row = None
    
    for y in range(height):
        filter_type = decompressed[i]
        new_data.append(0)  # Use filter type 0 (None) for output
        i += 1

        # Extract current row data (without filter byte)
        current_row = bytearray(decompressed[i:i + stride])
        
        # Reverse PNG filtering to get actual pixel values
        actual_pixels = apply_png_filter_reverse(
            filter_type=filter_type, 
            current_row=current_row, 
            previous_row=previous_row, 
            bytes_per_pixel=4
        )
        
        # Process pixels in the current row
        processed_row = bytearray()
        for x in range(width):
            # Use x-based indexing for actual_pixels (row data)
            pixel_idx = x * 4
            r = actual_pixels[pixel_idx]
            g = actual_pixels[pixel_idx + 1]
            b = actual_pixels[pixel_idx + 2]
            a = actual_pixels[pixel_idx + 3]
            
            if r == 220:
                tr, tg, tb = target_rgb
                processed_row += bytes([tr, tg, tb, 255])  # Use actual target color
            else:
                processed_row += bytes([0, 0, 0, 0])  # Transparent
        
        # Add processed row to output
        new_data += processed_row
        
        # Save current row for next iteration
        previous_row = actual_pixels
        i += stride

    print(i / 4)

    compressed = zlib.compress(bytes(new_data))

    # Write PNG to memory buffer
    buffer = io.BytesIO()
    buffer.write(b'\x89PNG\r\n\x1a\n')
    write_chunk(buffer, b'IHDR', ihdr)
    write_chunk(buffer, b'IDAT', compressed)
    for chunk_type, data in chunks:
        if chunk_type != b'IDAT' and chunk_type != b'IEND':
            write_chunk(buffer, chunk_type, data)
    write_chunk(buffer, b'IEND', b'')
    buffer.seek(0)
    return buffer