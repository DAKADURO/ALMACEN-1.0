from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from fastapi import Header, Request
from dotenv import load_dotenv

load_dotenv()

# Dictionary to store engines for each context
engines = {}
SessionLocals = {}

Base = declarative_base()

def get_engine(context: str):
    db_filename = f"almacen_{context.lower()}.db"
    db_url = f"sqlite:///./{db_filename}"
    
    if db_url not in engines:
        engines[db_url] = create_engine(
            db_url, connect_args={"check_same_thread": False}
        )
        SessionLocals[db_url] = sessionmaker(
            autocommit=False, autoflush=False, bind=engines[db_url]
        )
    return engines[db_url], SessionLocals[db_url]

# Default exports for backward compatibility (defaults to tuberia)
engine, SessionLocal = get_engine("tuberia")

def get_db(request: Request):
    # Default to 'tuberia' if no header is provided
    context = request.headers.get("X-Inventory-Context", "tuberia").lower()
    if context not in ["tuberia", "refacciones"]:
        context = "tuberia"
        
    _, SessionLocal = get_engine(context)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
