# Learning System

Hệ thống quản lý học tập (Learning System) 


## Cấu trúc thư mục

```
├── backend
│   ├── app
│   ├── requirements.txt
│   └── venv
├── frontend
│   ├── src
│   ├── public
│   ├── package.json
│   └── ...
├── package.json
└── ...
```

### 1. Clone project

```bash
git clone <repository-url>
cd learning-system
```

### 2. Cài đặt backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```


### 3. Cài đặt frontend

```bash
cd frontend
npm install
npm run dev
```

