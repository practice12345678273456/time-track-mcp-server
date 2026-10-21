from datetime import date

from fastmcp import FastMCP

import db_creation as db

mcp = FastMCP(
    name="Time Tracker MCP"
)

db.init_db()


@mcp.tool(name="Log_Time")
def log_time(employee_name: str, project: str, entry_date: str, hours: float, description: str = ""):
    """Log hours an employee worked on a project. entry_date must be YYYY-MM-DD; hours must be between 0 and 24."""
    try:
        date.fromisoformat(entry_date)
    except ValueError:
        return f"Invalid date '{entry_date}'. Use the format YYYY-MM-DD."
    if hours > 24:
        return "Hours cannot be more than 24 for a single entry."
    try:
        return db.log_time(employee_name.strip(), project.strip(), entry_date, hours, description.strip())
    except ValueError as e:
        return str(e)


@mcp.tool(name="List_Entries")
def list_entries():
    """List every time entry, newest first."""
    return db.list_all_entries()


@mcp.tool(name="Get_Timesheet")
def get_timesheet(employee_name: str, start_date: str | None = None, end_date: str | None = None):
    """Return one employee's time entries, optionally limited to a date range (YYYY-MM-DD)."""
    entries = db.get_timesheet(employee_name, start_date, end_date)
    if not entries:
        return f"No time entries found for '{employee_name}'."
    return {
        "employee_name": employee_name,
        "total_hours": sum(e["hours"] for e in entries),
        "entries": entries,
    }


@mcp.tool(name="List_Projects")
def list_projects():
    """List every project that has time logged against it."""
    return db.list_projects()


@mcp.tool(name="Project_Summary")
def project_summary(project: str):
    """Return the total hours on a project and the hours each employee spent on it."""
    try:
        return db.get_project_summary(project)
    except ValueError as e:
        return str(e)


@mcp.resource("resource://projects")
def projects_resource():
    """Expose the current list of projects."""
    return "\n".join(db.list_projects())


@mcp.prompt(name="Weekly_Report_Prompt")
def weekly_report_prompt(employee_name: str, start_date: str, end_date: str):
    """Ask the assistant to write a weekly time report for one employee."""
    return (
        f"Use the Get_Timesheet tool to fetch the time entries for {employee_name} "
        f"from {start_date} to {end_date}. Then write a short weekly report: total hours, "
        "hours per project, and a one-line summary of the work done each day. "
        "Only use the data returned by the tool; do not invent entries."
    )


if __name__ == "__main__":
    mcp.run()
