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
    canvas_width: float = 500,
    canvas_height: float = 842,
) -> str:
    # If input is a URL download it first
    if input_path.startswith("http"):
        response = requests.get(input_path)
        temp_path = os.path.join(SIGNED_DIR, f"temp_{output_filename}")
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        input_path = temp_path

    doc = fitz.open(input_path)
    page_index = page_number - 1
    if page_index >= len(doc):
        page_index = 0

    page = doc[page_index]
    page_width = page.rect.width
    page_height = page.rect.height

    signed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    # Scale factors
    scale_x = page_width / canvas_width
    scale_y = page_height / canvas_height

    # Use signature position from canvas
    # x, y are center positions from canvas
    # Convert to PDF coordinates
    if signature_image_base64 and x is not None and y is not None:
        try:
            if ',' in signature_image_base64:
                signature_image_base64 = signature_image_base64.split(',')[1]
            img_data = base64.b64decode(signature_image_base64)

            # Block dimensions
            block_width = 180
            block_height = 90

            # Scale position from canvas to PDF
            scaled_x = (x * scale_x) - (block_width / 2)
            scaled_y = (y * scale_y) - (block_height / 2)

            # Keep within page bounds
            scaled_x = min(max(0, scaled_x), page_width - block_width)
            scaled_y = min(max(0, scaled_y), page_height - block_height)

            # Draw outer border
            outer_rect = fitz.Rect(
                scaled_x,
                scaled_y,
                scaled_x + block_width,
                scaled_y + block_height
            )
            page.draw_rect(outer_rect, color=(0, 0, 0), width=1.0)

            # Signature image
            sig_rect = fitz.Rect(
                scaled_x + 5,
                scaled_y + 5,
                scaled_x + block_width - 5,
                scaled_y + 50
            )
            page.insert_image(sig_rect, stream=img_data)

            # Separator line
            page.draw_line(
                fitz.Point(scaled_x, scaled_y + 55),
                fitz.Point(scaled_x + block_width, scaled_y + 55),
                color=(0, 0, 0),
                width=0.5
            )

            # Name
            name_rect = fitz.Rect(
                scaled_x + 5,
                scaled_y + 57,
                scaled_x + block_width - 5,
                scaled_y + 72
            )
            page.insert_textbox(
                name_rect,
                f"Signed by: {signer_name}",
                fontsize=8,
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_CENTER
            )

            # Date
            date_rect = fitz.Rect(
                scaled_x + 5,
                scaled_y + 73,
                scaled_x + block_width - 5,
                scaled_y + 88
            )
            page.insert_textbox(
                date_rect,
                f"Date: {signed_at}",
                fontsize=8,
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_CENTER
            )

        except Exception as e:
            print(f"Error embedding signature: {e}")

    else:
        # No signature image - use signature item position or default
        sig_x = x if x else page_width - 220
        sig_y = y if y else page_height - 120

        scaled_x = (sig_x * scale_x) - 90
        scaled_y = (sig_y * scale_y) - 45

        scaled_x = min(max(0, scaled_x), page_width - 180)
        scaled_y = min(max(0, scaled_y), page_height - 90)

        outer_rect = fitz.Rect(scaled_x, scaled_y, scaled_x + 180, scaled_y + 60)
        page.draw_rect(outer_rect, color=(0, 0, 0), width=1.0)
        page.insert_textbox(
            outer_rect,
            f"Signed by: {signer_name}\nDate: {signed_at}",
            fontsize=9,
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

    if 'temp_path' in locals() and os.path.exists(temp_path):
        os.remove(temp_path)

    return output_path