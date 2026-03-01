from fastapi import FastAPI
from app.routes import gpa_routes

app = FastAPI()

app.include_router(gpa_routes.router)

@app.get("/")
def root():
    return{"message": "PathGPA Backend Running"}
