import fitz  # PyMuPDF
import os
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
    password: str = None
) -> str:
    # Open the PDF
    doc = fitz.open(input_path)

    # Get the page (0-indexed)
    page_index = page_number - 1
    if page_index >= len(doc):
        page_index = 0

    page = doc[page_index]

    # Get page dimensions
    page_width = page.rect.width
    page_height = page.rect.height

    # Signature text
    signed_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    signature_text = f"Signed by: {signer_name}\nDate: {signed_at}"

    # Place signature at RIGHT BOTTOM of page
    margin = 20
    box_width = 200
    box_height = 50

    right_x = page_width - box_width - margin
    bottom_y = page_height - box_height - margin

    rect = fitz.Rect(right_x, bottom_y, right_x + box_width, bottom_y + box_height)

    # Draw rectangle border
    page.draw_rect(rect, color=(0, 0, 0), width=1.5)

    # Insert signature text
    page.insert_textbox(
        rect,
        signature_text,
        fontsize=10,
        color=(0, 0, 0),
        align=fitz.TEXT_ALIGN_CENTER
    )

    # Save signed PDF
    output_path = os.path.join(SIGNED_DIR, output_filename)

    # Add password protection if provided
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

    return output_path