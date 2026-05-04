
import re

def count_tags(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex to find <tag and </tag
    # This is not perfect for JSX but might help find obvious imbalances
    opens = re.findall(r'<([a-zA-Z0-9]+)', content)
    closes = re.findall(r'</([a-zA-Z0-9]+)', content)
    
    print(f"Total opens: {len(opens)}")
    print(f"Total closes: {len(closes)}")
    
    counts = {}
    for t in opens:
        counts[t] = counts.get(t, 0) + 1
    for t in closes:
        counts[t] = counts.get(t, 0) - 1
    
    for t, c in counts.items():
        if c != 0:
            print(f"Tag {t}: {c}")

count_tags('E:/Affilate/New/lead-management-frontend/src/pages/ManagerDashboard.jsx')
