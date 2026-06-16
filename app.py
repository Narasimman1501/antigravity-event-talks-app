import os
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request
from datetime import datetime

app = Flask(__name__)

# URL of the BigQuery Release Notes Atom Feed
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to store parsed releases
_cache = {
    "data": None,
    "last_fetched": None
}

def parse_release_feed():
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        
        root = ET.fromstring(response.content)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        releases = []
        
        for entry in root.findall('atom:entry', ns):
            title = entry.find('atom:title', ns)
            date_str = title.text if title is not None else "Unknown Date"
            
            updated_el = entry.find('atom:updated', ns)
            updated_str = updated_el.text if updated_el is not None else ""
            
            link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
            
            id_el = entry.find('atom:id', ns)
            entry_id = id_el.text if id_el is not None else ""
            
            content_el = entry.find('atom:content', ns)
            content_html = content_el.text if content_el is not None else ""
            
            # Parse the HTML content using BeautifulSoup
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = None
            current_content = []
            entry_updates = []
            
            for element in soup.contents:
                # Some elements might just be whitespace strings, check if they have a name
                if hasattr(element, 'name') and element.name == 'h3':
                    if current_content or current_type:
                        entry_updates.append({
                            "type": current_type or "General",
                            "content": "".join(str(x) for x in current_content).strip()
                        })
                    current_type = element.get_text().strip()
                    current_content = []
                else:
                    current_content.append(element)
            
            # Add the last update
            if current_content or current_type:
                entry_updates.append({
                    "type": current_type or "General",
                    "content": "".join(str(x) for x in current_content).strip()
                })
            
            # If no updates were successfully extracted (empty content), create a fallback
            if not entry_updates:
                entry_updates.append({
                    "type": "General",
                    "content": content_html.strip() or "No details provided."
                })
                
            # For each sub-update, we assign a unique ID so the user can select it
            for idx, update in enumerate(entry_updates):
                releases.append({
                    "id": f"{entry_id}_{idx}".replace(':', '_').replace('#', '_'),
                    "date": date_str,
                    "updated_raw": updated_str,
                    "link": link,
                    "type": update["type"],
                    "content": update["content"]
                })
                
        return {"releases": releases, "success": True}
        
    except Exception as e:
        return {"releases": [], "success": False, "error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or _cache["data"] is None:
        result = parse_release_feed()
        if result["success"]:
            _cache["data"] = result["releases"]
            _cache["last_fetched"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        else:
            # If fetch fails, return cached if we have it
            if _cache["data"] is not None:
                return jsonify({
                    "releases": _cache["data"],
                    "success": True,
                    "cached": True,
                    "warning": f"Could not refresh feed. Using cached data. Error: {result.get('error')}"
                })
            return jsonify(result), 500
            
    return jsonify({
        "releases": _cache["data"],
        "success": True,
        "cached": force_refresh == False,
        "last_fetched": _cache["last_fetched"]
    })

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
