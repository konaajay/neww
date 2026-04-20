# CRM Sales Tool - Startup Script

echo "Starting Backend (Spring Boot)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd neww/LeadManagement; ./mvnw spring-boot:run"

echo "Starting Frontend (React/Vite)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd neww/lead-management-frontend; npm.cmd run dev"

echo "-------------------------------------------------------"
echo "Both processes are starting in separate windows."
echo "Backend: http://localhost:8081"
echo "Frontend: http://localhost:3000"
echo "-------------------------------------------------------"
