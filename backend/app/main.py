from fastapi import FastAPI

app = FastAPI(
    title="Royal Square Portal API",
    description="Financial Onboarding & FNA Automation",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Royal Square Portal backend is running"
    }