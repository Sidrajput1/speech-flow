from sqlalchemy import text

from app.db.database import engine


def main():

    print("Connecting to PostgreSQL...")

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT 1")
        ).scalar_one()

        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        print("Connection test:", result)
        print("Database:", database_name)

    print("Database connected successfully!")


if __name__ == "__main__":
    main()