import os
from sqlalchemy import create_engine, text
from database import Base
import models # ensure models are registered with Base

def init_db():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set, skipping DB init")
        return

    if db_url.startswith("postgresql"):
        print("Initializing PostgreSQL database...")
        engine = create_engine(db_url)
        with engine.connect() as conn:
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS tuberia"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS refacciones"))
            conn.commit()

        # Init tables for each schema
        for schema in ["tuberia", "refacciones"]:
            schema_engine = create_engine(
                db_url,
                connect_args={"options": f"-csearch_path={schema}"}
            )
            Base.metadata.create_all(bind=schema_engine)
            print(f"Tables initialized in schema: {schema}")
    else:
        # For local SQLite, create tables in both databases
        for context in ["tuberia", "refacciones"]:
            from database import get_engine
            engine, _ = get_engine(context)
            Base.metadata.create_all(bind=engine)
            print(f"Tables initialized for SQLite context: {context}")

if __name__ == "__main__":
    init_db()
