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

@router.get("/{project_id}/requesters", response_model=List[schemas.ProjectRequester])
def read_project_requesters(project_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.ProjectRequester).filter(models.ProjectRequester.project_id == project_id).all()

@router.post("/{project_id}/requesters", response_model=schemas.ProjectRequester)
def create_project_requester(project_id: int, requester: schemas.ProjectRequesterBase, db: Session = Depends(database.get_db)):
    # Verify project exists
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
    db_requester = db.query(models.ProjectRequester).filter(
        models.ProjectRequester.name == requester.name,
        models.ProjectRequester.project_id == project_id
    ).first()
    
    if db_requester:
        return db_requester
        
    new_requester = models.ProjectRequester(name=requester.name.strip(), project_id=project_id)
    db.add(new_requester)
    db.commit()
    db.refresh(new_requester)
    return new_requester
