# Use the official Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Copy the requirements file into the container
COPY api/requirements.txt .

# Install the Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8080 (Google Cloud Run default)
EXPOSE 8080

# Command to run the FastAPI application
CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8080"]
