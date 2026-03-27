from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix='/course', tags=["Course"])
