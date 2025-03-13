@echo off
REM Create a Python virtual environment if it does not exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate the virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Change directory to backend
cd backend

REM Run Django migrations
echo Running migrations...
python manage.py makemigrations
python manage.py migrate

echo Setup complete!
