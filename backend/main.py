from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import evaluation, live_imputation

app = FastAPI(title="Autonomous Spatio-Temporal Imputer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evaluation.router, prefix="/api/evaluation", tags=["Evaluation"])
app.include_router(live_imputation.router, prefix="/api/live", tags=["Live Imputation"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Agent Imputer Backend"}
