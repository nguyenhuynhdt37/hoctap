import uuid

from fastapi import HTTPException, UploadFile

from app.services.shares.file_storage import FileStorageService


class UploadTiptapService:
    def __init__(self):
        pass

    async def upload_image_async(
        self,
        user_id: uuid.UUID,
        file: UploadFile,
        storage_service: FileStorageService,
        role: str,
    ):
        # Implementation to get user profile by user_id
        try:

            file_url = await storage_service.upload_file(
                [f"shares/{role}", str(object=user_id)],
                file.filename or "image.png",
                await file.read(),
                file.content_type,
            )
            return file_url["url"]
        except Exception as e:

            raise HTTPException(status_code=500, detail=f"error {e}")
