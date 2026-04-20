import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

#Initializing Firebase Admin SDK 
cred = credentials.Certificate("app/firebase_service_account.json")
firebase_admin.initialize_app(cred)

security = HTTPBearer() # Security scheme using to autheniticate reques using token

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")