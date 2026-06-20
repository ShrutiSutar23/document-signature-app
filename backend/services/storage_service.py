from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BUCKET_NAME = "documents"

def upload_file_to_supabase(file_path: str, file_name: str) -> str:
    with open(file_path, 'rb') as f:
        file_data = f.read()

    # Upload to Supabase Storage
    response = supabase.storage.from_(BUCKET_NAME).upload(
        path=file_name,
        file=file_data,
        file_options={"content-type": "application/pdf"}
    )

    # Get public URL
    public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
    return public_url

def delete_file_from_supabase(file_name: str):
    supabase.storage.from_(BUCKET_NAME).remove([file_name])

def get_public_url(file_name: str) -> str:
    return supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)