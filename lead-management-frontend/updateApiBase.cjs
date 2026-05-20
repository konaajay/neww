const fs = require('fs'); 
const files = ['WebinarManagement.jsx', 'TrackingDashboard.jsx', 'StudentRegistrationForm.jsx', 'SingleGenerationForm.jsx', 'ConfigurationPanel.jsx']; 
const newApiBase = "const API_BASE = import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8080' : 'http://3.84.147.168:8080');"; 
files.forEach(file => { 
  let content = fs.readFileSync('src/components/' + file, 'utf8'); 
  content = content.replace(/const API_BASE = 'http:\/\/52\.90\.221\.224:8081';/g, newApiBase); 
  if (file === 'TrackingDashboard.jsx') { 
    content = content.replace(/52\.90\.221\.224:8081/g, '{API_BASE.replace("http://", "")}'); 
  } 
  fs.writeFileSync('src/components/' + file, content); 
});
