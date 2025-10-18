from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.settings import settings
from app.api.v1 import auth, users, admin, exams, upload, ai, submissions, statistics, categories, question_banks, practice, exam_generator, reports, admin_analytics


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    debug=settings.DEBUG
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(exams.router, prefix="/api/v1/exams", tags=["exams"])
app.include_router(upload.router, prefix="/api/v1/upload", tags=["upload"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["ai"])
app.include_router(submissions.router, prefix="/api/v1/submissions", tags=["submissions"])
app.include_router(statistics.router, prefix="/api/v1/statistics", tags=["statistics"])
app.include_router(categories.router, prefix="/api/v1/categories", tags=["categories"])
app.include_router(question_banks.router, prefix="/api/v1/question-banks", tags=["question-banks"])
app.include_router(practice.router, prefix="/api/v1/practice", tags=["practice"])
app.include_router(exam_generator.router, prefix="/api/v1/exam-generator", tags=["exam-generator"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(admin_analytics.router, prefix="/api/v1/admin-analytics", tags=["admin-analytics"])

@app.get("/")
async def root():
    return {
        "message": "Learning System API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
 
