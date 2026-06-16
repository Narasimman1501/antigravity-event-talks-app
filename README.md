# BigQuery Release Hub

A premium, state-of-the-art web application that aggregates, formats, and displays the latest Google Cloud BigQuery release notes. The application comes equipped with a custom-designed X (formerly Twitter) composer, allowing users to draft and share specific updates instantly.

---

## ✨ Features

- **Automated XML Parsing**: Pulls directly from the official Google Cloud BigQuery Release Notes RSS/Atom feed.
- **Granular Update Splitting**: Automatically processes daily release logs, separating multiple updates on the same day into individual feature, issue, or deprecation items.
- **Server-Side Cache**: Stores parsed feed items in memory to speed up initial loads and reduce external requests.
- **Glassmorphic Dark Theme**: A responsive dark-themed dashboard built with custom variables, smooth transitions, and type-specific indicators ( Emerald for Features, Amber for Issues, Rose for Deprecations).
- **Keyword Search & Category Filtering**: Live-filters release items based on categories and search query matches.
- **Custom Tweet Composer Modal**: Real-time validation of character limits, SVG circular progress bar, toggles for release links/dates/hashtags, and integration with the X Web Intent API.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13+, Flask
- **Frontend**: HTML5, Vanilla JavaScript, CSS3
- **Parsing Libraries**: BeautifulSoup4, Requests
- **Icons**: FontAwesome 6

---

## 📂 Project Structure

```text
├── app.py                  # Core Flask server-side application
├── templates/
│   └── index.html          # Main HTML5 layout & modal structure
├── static/
│   ├── css/
│   │   └── styles.css      # Premium dark-theme CSS stylesheet
│   └── js/
│       └── app.js          # Client-side state & Tweet composer logic
├── .gitignore              # Configured Git ignore list
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have Python 3.13+ installed on your system.

### 1. Install Dependencies

Install the required Python packages:
```bash
pip install flask requests beautifulsoup4
```

### 2. Run the Server

Start the Flask application from the root directory:
```bash
python app.py
```

### 3. Open in Browser

Once started, navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🐦 Twitter/X Sharing Mechanics

- The application evaluates text character limits in real-time.
- Per Twitter's developer guidelines, URLs count as exactly **23 characters** in the total count regardless of their actual length.
- The composer includes toggles for dates, links, and hashtags, updating the output instantly.
- Clicking **Share to X** opens a browser window containing the pre-composed text using the official Twitter Web Intent.
