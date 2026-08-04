import openpyxl
import io
from PIL import Image

excel_path = "/Applications/SAFAWALA MASTERPLAN/INVENTORY DETAILS/MALAS/MALAS.xlsx"

try:
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb.active
    print("Number of images in sheet:", len(ws._images))
    if len(ws._images) > 0:
        first_img = ws._images[0]
        
        # Check coordinates
        if hasattr(first_img.anchor, '_from'):
            print("Row:", first_img.anchor._from.row)
            print("Column:", first_img.anchor._from.col)
            
        # Try to read raw data
        # In openpyxl, first_img.ref or first_img._data contains the binary data.
        # Let's see if first_img has _data attribute.
        if hasattr(first_img, '_data'):
            print("Has _data attribute")
            data = first_img._data()
            print("Data length:", len(data))
            # Try to open with PIL
            img = Image.open(io.BytesIO(data))
            print("Image Format:", img.format)
            print("Image Size:", img.size)
        elif hasattr(first_img, 'ref'):
            print("Has ref attribute")
            # In some openpyxl versions, first_img.ref is the path or reference
            print("ref:", first_img.ref)
        else:
            # Let's inspect all attributes of first_img
            print("Attributes of image:", dir(first_img))
            
except Exception as e:
    print("Error:", e)
