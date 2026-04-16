from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database

router = APIRouter(
    prefix="/projects",
    tags=["projects"]
)

@router.get("/", response_model=List[schemas.Project])
def read_projects(db: Session = Depends(database.get_db)):
    return db.query(models.Project).all()

@router.post("/", response_model=schemas.Project)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(database.get_db)):
    db_project = db.query(models.Project).filter(models.Project.name == project.name).first()
    if db_project:
        return db_project # Return existing if name matches
    
    new_project = models.Project(name=project.name.strip())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project
