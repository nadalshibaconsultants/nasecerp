from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.models import Project, User
from app.schemas import ProjectCreate, ProjectRead, ProjectUpdate
from app.dependencies import get_db

router = APIRouter()

@router.post("/", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    db_project = Project(**project.dict())
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.get("/", response_model=List[ProjectRead])
async def list_projects(db: AsyncSession = Depends(get_db)):
    result = await db.execute("SELECT * FROM projects")
    projects = result.scalars().all()
    return projects

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.get(Project, project_id)
    if not result:
        raise HTTPException(status_code=404, detail="Project not found")
    return result

@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(project_id: int, project: ProjectUpdate, db: AsyncSession = Depends(get_db)):
    db_project = await db.get(Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in project.dict(exclude_unset=True).items():
        setattr(db_project, field, value)
    await db.commit()
    await db.refresh(db_project)
    return db_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    db_project = await db.get(Project, project_id)
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(db_project)
    await db.commit()
    return
