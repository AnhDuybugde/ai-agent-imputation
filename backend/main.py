from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import evaluation, live_imputation, workspace, imputer

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
app.include_router(workspace.router, prefix="/api/workspace", tags=["Workspace Integration"])
app.include_router(imputer.router, prefix="/api/imputation", tags=["Full Imputation Pipeline"])

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Agent Imputer Backend"}
