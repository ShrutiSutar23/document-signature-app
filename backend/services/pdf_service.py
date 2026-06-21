
import fitz
import os
import requests
import base64
from datetime import datetime

SIGNED_DIR = "signed_uploads"
os.makedirs(SIGNED_DIR, exist_ok=True)


def clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


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

    # Download PDF if URL
    if input_path.startswith("http"):
        response = requests.get(input_path)

        temp_path = os.path.join(
            SIGNED_DIR,
            f"temp_{output_filename}"
        )

        with open(temp_path, "wb") as f:
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

    scale_x = page_width / canvas_width
    scale_y = page_height / canvas_height

    try:

        # ====================================
        # SIGNATURE IMAGE
        # ====================================
        if signature_image_base64 and x is not None and y is not None:

            if "," in signature_image_base64:
                signature_image_base64 = signature_image_base64.split(",")[1]

            img_data = base64.b64decode(signature_image_base64)

            signature_width = 160
            signature_height = 50

            pdf_x = clamp(
                (x * scale_x) - (signature_width / 2),
                0,
                page_width - signature_width
            )

            pdf_y = clamp(
                (y * scale_y) - (signature_height / 2),
                0,
                page_height - signature_height
            )

            signature_rect = fitz.Rect(
                pdf_x,
                pdf_y,
                pdf_x + signature_width,
                pdf_y + signature_height
            )

            page.insert_image(
                signature_rect,
                stream=img_data
            )

        # ====================================
        # NAME
        # ====================================
        if name_x is not None and name_y is not None:

            name_width = 220
            name_height = 20

            pdf_name_x = clamp(
                (name_x * scale_x) - (name_width / 2),
                0,
                page_width - name_width
            )

            pdf_name_y = clamp(
                (name_y * scale_y) - (name_height / 2),
                0,
                page_height - name_height
            )

            page.insert_textbox(
                fitz.Rect(
                    pdf_name_x,
                    pdf_name_y,
                    pdf_name_x + name_width,
                    pdf_name_y + name_height
                ),
                signer_name,
                fontsize=12,
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_CENTER
            )

        # ====================================
        # DATE
        # ====================================
        if date_x is not None and date_y is not None:

            date_width = 240
            date_height = 20

            pdf_date_x = clamp(
                (date_x * scale_x) - (date_width / 2),
                0,
                page_width - date_width
            )

            pdf_date_y = clamp(
                (date_y * scale_y) - (date_height / 2),
                0,
                page_height - date_height
            )

            page.insert_textbox(
                fitz.Rect(
                    pdf_date_x,
                    pdf_date_y,
                    pdf_date_x + date_width,
                    pdf_date_y + date_height
                ),
                signed_at,
                fontsize=10,
                color=(0, 0, 0),
                align=fitz.TEXT_ALIGN_CENTER
            )

    except Exception as e:
        print(f"Error embedding signature: {e}")

    output_path = os.path.join(
        SIGNED_DIR,
        output_filename
    )

    if password:
        doc.save(
            output_path,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            user_pw=password,
            owner_pw=password + "_owner",
            permissions=fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY,
        )
    else:
        doc.save(output_path)

    doc.close()

    if "temp_path" in locals() and os.path.exists(temp_path):
        os.remove(temp_path)

    return output_path

