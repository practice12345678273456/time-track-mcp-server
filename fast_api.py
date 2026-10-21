from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db_creation as db

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="Time Tracker API",
    description="A simple time tracker API"
)

# Serve everything inside /static (css, js) at the URL /static/...
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class TimeEntryIn(BaseModel):
    employee_name: str = Field(min_length=1)
    project: str = Field(min_length=1)
    entry_date: str  # YYYY-MM-DD
    hours: float = Field(gt=0, le=24)
    description: str = ""


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/")
def home():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/entries")
def list_entries():
    return db.list_all_entries()


@app.post("/api/entries", status_code=201)
def create_entry(entry: TimeEntryIn):
    try:
        return db.log_time(
            entry.employee_name.strip(),
            entry.project.strip(),
            entry.entry_date,
            entry.hours,
            entry.description.strip(),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/projects")
def list_projects():
    return db.list_projects()


@app.get("/api/projects/{project}/summary")
def project_summary(project: str):
    try:
        return db.get_project_summary(project)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/timesheet/{employee_name}")
def timesheet(employee_name: str, start_date: str | None = None, end_date: str | None = None):
    return db.get_timesheet(employee_name, start_date, end_date)
