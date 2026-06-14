from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
import os

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_signing_link_email(
    recipient_email: str,
    document_name: str,
    signing_link: str
):
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">📄 Document Signature Request</h2>
        <p>You have been requested to sign a document.</p>
        <p><strong>Document:</strong> {document_name}</p>
        <p>Click the button below to sign the document:</p>
        <a href="{signing_link}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
            ✍️ Sign Document
        </a>
        <p style="color: #666; margin-top: 20px; font-size: 12px;">
            This link will expire in 24 hours.
        </p>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"Sign Request: {document_name}",
        recipients=[recipient_email],
        body=html_content,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)