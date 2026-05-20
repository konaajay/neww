const fs = require('fs'); 

// 1. Update Certificate Components
const certFiles = ['WebinarManagement.jsx', 'TrackingDashboard.jsx', 'StudentRegistrationForm.jsx', 'SingleGenerationForm.jsx', 'ConfigurationPanel.jsx']; 
const oldApiBaseRegex = /const API_BASE = import\.meta\.env\.VITE_API_BASE_URL \|\| "http:\/\/3\.84\.147\.168:8080";/g;
const newApiBase = "const API_BASE = import.meta.env.VITE_API_BASE_URL || \"http://52.87.168.111:8080\";"; 

certFiles.forEach(file => { 
  let content = fs.readFileSync('src/components/' + file, 'utf8'); 
  content = content.replace(oldApiBaseRegex, newApiBase); 
  fs.writeFileSync('src/components/' + file, content); 
});

// 2. Update api.js global CRM config
let apiJsContent = fs.readFileSync('src/api/api.js', 'utf8');
apiJsContent = apiJsContent.replace(/http:\/\/3\.84\.147\.168:8080/g, "http://52.87.168.111:8080");
fs.writeFileSync('src/api/api.js', apiJsContent);
