import os
import sys
from PIL import Image

def compress_image(filepath, max_dimension=800, quality=55):
    try:
        # Keep track of original size
        orig_size = os.path.getsize(filepath)
        if orig_size == 0:
            return 0, 0
        
        # Open image
        img = Image.open(filepath)
        orig_format = img.format
        if not orig_format:
            return 0, 0
            
        # Check if resize is needed
        w, h = img.size
        if w > max_dimension or h > max_dimension:
            if w > h:
                new_w = max_dimension
                new_h = int(h * (max_dimension / w))
            else:
                new_h = max_dimension
                new_w = int(w * (max_dimension / h))
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # We save to a temporary file first to verify it's actually smaller
        temp_filepath = filepath + ".tmp"
        
        # Save based on format
        if orig_format == 'JPEG' or orig_format == 'JPG':
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            img.save(temp_filepath, 'JPEG', quality=quality, optimize=True)
        elif orig_format == 'PNG':
            # Convert to adaptive color palette to shrink PNG file size massively
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                img_p = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
                img_p.save(temp_filepath, 'PNG', optimize=True)
            else:
                img_p = img.convert('RGB').convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
                img_p.save(temp_filepath, 'PNG', optimize=True)
        else:
            # Other formats (e.g. webp)
            img.save(temp_filepath, orig_format, quality=quality)
            
        # Check size of new file
        new_size = os.path.getsize(temp_filepath)
        
        if new_size < orig_size:
            # Overwrite original
            os.replace(temp_filepath, filepath)
            return orig_size, new_size
        else:
            # New is larger, discard temporary
            os.remove(temp_filepath)
            return orig_size, orig_size
            
    except Exception as e:
        print(f"Error compressing {filepath}: {e}", file=sys.stderr)
        return 0, 0

def main():
    target_dir = "../INVENTORY DETAILS"
    if not os.path.exists(target_dir):
        print(f"Error: Target directory '{target_dir}' does not exist.")
        sys.exit(1)
        
    print(f"Scanning for images in '{target_dir}'...")
    
    image_extensions = ('.png', '.jpg', '.jpeg', '.webp', '.PNG', '.JPG', '.JPEG')
    image_files = []
    
    for root, dirs, files in os.walk(target_dir):
        for f in files:
            if f.endswith(image_extensions):
                image_files.append(os.path.join(root, f))
                
    total_files = len(image_files)
    print(f"Found {total_files} images to process.")
    
    total_orig_size = 0
    total_new_size = 0
    compressed_count = 0
    
    for idx, filepath in enumerate(image_files):
        filename = os.path.basename(filepath)
        orig_size, new_size = compress_image(filepath)
        
        if orig_size > 0:
            total_orig_size += orig_size
            total_new_size += new_size
            if new_size < orig_size:
                compressed_count += 1
                saving = (orig_size - new_size) / (1024 * 1024)
                print(f"[{idx+1}/{total_files}] Compressed {filename}: {orig_size/1024:.1f}KB -> {new_size/1024:.1f}KB (Saved {saving:.2f}MB)")
            else:
                print(f"[{idx+1}/{total_files}] Skipped {filename} (Already optimized)")
                
    if total_orig_size > 0:
        saved_mb = (total_orig_size - total_new_size) / (1024 * 1024)
        pct = (total_orig_size - total_new_size) / total_orig_size * 100
        print("\n--- COMPRESSION SUMMARY ---")
        print(f"Processed: {total_files} files")
        print(f"Compressed: {compressed_count} files")
        print(f"Original Total Size: {total_orig_size / (1024*1024):.2f} MB")
        print(f"New Total Size: {total_new_size / (1024*1024):.2f} MB")
        print(f"Total Space Saved: {saved_mb:.2f} MB ({pct:.1f}% reduction)")
    else:
        print("No images were compressed.")

if __name__ == "__main__":
    main()
