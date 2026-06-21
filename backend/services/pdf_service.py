import fitz
import os
import requests
import base64
from datetime import datetime

SIGNED_DIR = "signed_uploads"
os.makedirs(SIGNED_DIR, exist_ok=True)

def embed_signature_on_pdf(
    input_path: str,
    output_filename: str,
    signer_name: str,
    x: float,
    y: float,
    page_number: int = 1,
    password: str = None,
    signature_image_base64: str = None,
    name_x: float = None,
    name_y: float = None,
    date_x: float = None,
    date_y: float = None,
) -> str:
    # If input is a URL download it first
    if input_path.startswith("http"):
        response = requests.get(input_path)
        temp_path = os.path.join(SIGNED_DIR, f"temp_{output_filename}")
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        input_path = temp_path

    # Open the PDF
    doc = fitz.open(input_path)

    page_index = page_number - 1
    if page_index >= len(doc):
        page_index = 0

    page = doc[page_index]
    page_width = page.rect.width
    page_height = page.rect.height

    signed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # Embed signature image if provided
    if signature_image_base64 and x is not None and y is not None:
        try:
            # Remove data URL prefix if present
            if ',' in signature_image_base64:
                signature_image_base64 = signature_image_base64.split(',')[1]
            img_data = base64.b64decode(signature_image_base64)
            img_rect = fitz.Rect(x, y, x + 160, y + 50)
            page.insert_image(img_rect, stream=img_data)
        except Exception as e:
            print(f"Error embedding signature image: {e}")

    # Embed signer name if position provided
    if name_x is not None and name_y is not None:
        name_rect = fitz.Rect(name_x, name_y, name_x + 150, name_y + 20)
        page.insert_textbox(
            name_rect,
            f"Signed by: {signer_name}",
            fontsize=10,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_LEFT
        )

    # Embed date if position provided
    if date_x is not None and date_y is not None:
        date_rect = fitz.Rect(date_x, date_y, date_x + 150, date_y + 20)
        page.insert_textbox(
            date_rect,
            f"Date: {signed_at}",
            fontsize=10,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_LEFT
        )

    # If no custom positions, add default signature box at bottom right
    if signature_image_base64 is None and name_x is None:
        margin = 20
        box_width = 200
        box_height = 50
        right_x = page_width - box_width - margin
        bottom_y = page_height - box_height - margin
        rect = fitz.Rect(right_x, bottom_y, right_x + box_width, bottom_y + box_height)
        page.draw_rect(rect, color=(0, 0, 0), width=1.5)
        page.insert_textbox(
            rect,
            f"Signed by: {signer_name}\nDate: {signed_at}",
            fontsize=10,
            color=(0, 0, 0),
            align=fitz.TEXT_ALIGN_CENTER
        )

    # Save signed PDF
    output_path = os.path.join(SIGNED_DIR, output_filename)

    if password:
        doc.save(
            output_path,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            user_pw=password,
            owner_pw=password + "_owner",
            permissions=fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY
        )
    else:
        doc.save(output_path)

    doc.close()

    # Clean up temp file
    if 'temp_path' in locals() and os.path.exists(temp_path):
        os.remove(temp_path)

    return output_path