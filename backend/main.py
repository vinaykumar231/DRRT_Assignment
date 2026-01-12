from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api.endpoints import router as api_router


app = FastAPI(
    title="Settlement Loss Calculator API",
    description="API for calculating recognized losses in securities settlements",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router,prefix="/api",tags=["Settlement Calculator"])

if __name__ == "__main__":
    uvicorn.run( "main:app",host="0.0.0.0", port=8000,reload=True)
