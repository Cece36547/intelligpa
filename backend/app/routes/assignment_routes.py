from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix='/assignment', tags=["Assignment"])
