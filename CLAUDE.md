# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
AI-powered Todo List application with a distinct two-level task management system:

### Core Concept: Main Task + Subtask Architecture
- **Main Tasks**: 사용자가 중앙 패널에 입력하는 큰 단위의 과제/목표
- **Subtasks**: AI가 분석하여 제안하고 사용자가 수정하는 세부 실행 단계들
- **Daily Schedule**: 왼쪽 패널에서 subtask들을 시간별로 관리하는 일정표

### 3-Panel Workflow
1. **중앙 패널**: 사용자가 Main Task 생성/관리
2. **우측 패널**: AI가 Main Task 분석 → Subtask 제안 → 사용자 수정
3. **왼쪽 패널**: Subtask들을 일정별로 배치하고 체크박스로 완료 관리

**중요**: 왼쪽 패널의 task와 중앙 패널의 task는 엄밀히 다름 (Subtask vs Main Task)

## Architecture
- **Frontend**: React + TypeScript + TailwindCSS (port 3000)
- **Backend**: Node.js + Express + SQLite (port 5000) 
- **AI Integration**: OpenAI GPT API for task analysis and planning
- **Animation**: Framer Motion for visual rewards
- **Calendar**: React Calendar integration for deadline management

## Development Commands

### Frontend (React App)
```bash
cd ai-todo-app
npm start          # Start development server (localhost:3000)
npm run build      # Build for production
npm test           # Run tests
npm run eject      # Eject from Create React App (irreversible)
```

### Backend (Express Server)
```bash
cd ai-todo-app/server
npm run dev        # Start development server with nodemon
npm start          # Start production server
npm run build      # Compile TypeScript (when configured)
```

## Current Features ✅
- **Progress Visualization**: 행복감을 주는 진행률 표시 UI (프로그레스 바, 통계, 전체 완료 축하 메시지)
- **Basic Todo Management**: 할일 추가, 완료, 삭제 기능
- **AI Suggestions**: 입력 중 실시간 AI 제안 시스템
- **Celebration System**: 완료 시 축하 메시지 및 애니메이션

## Upcoming Features 🚀

### Phase 1: AI-Powered Task Management
1. **카테고리/태그 시스템**
   - AI가 할일을 자동으로 분류 (학습, 과제, 개인, 업무 등)
   - 사용자 드래그앤드롭으로 수정 가능
   - 색상별 구분 및 필터링 기능

2. **과제 스펙 분석 및 단계별 분해**
   - 과제 내용을 입력하면 AI가 분석
   - 단계별 할일 자동 생성 (개요 작성 → 자료 조사 → 초안 작성 → 검토 등)
   - 예상 소요 시간 및 난이도 표시

### Phase 2: Smart Planning & Scheduling  
3. **달력 통합**
   - React Calendar를 활용한 마감일 설정
   - 일정 시각화 및 충돌 감지
   - 월/주/일 단위 계획 보기

4. **AI 일정 조율 시스템**
   - 사용자와 대화형 우선순위 설정
   - 마감일, 중요도, 예상 소요시간 고려
   - 최적 일정 자동 제안

### Phase 3: 3컬럼 레이아웃 및 상세 분석 시스템

5. **3컬럼 레이아웃 구현**
   - **왼쪽**: Todooby 채팅 인터페이스
   - **중앙**: 현재 할일 목록 (기존)
   - **오른쪽**: 선택된 할일 상세 분석 박스

6. **할일 상세 분석 기능**
   - 각 할일에 화살표 버튼(>) 추가
   - 클릭 시 오른쪽 상세 박스 활성화
   - 과제 소스 및 자료 업로드 공간
   - 달력 연동 마감기한 설정
   - 세부 진행 단계 관리

7. **Todooby 채팅 시스템**
   - 사용자 정보 수집 인터페이스
   - 감정 상태 체크 및 케어 기능
   - 학습 패턴 및 성향 분석
   - 개인화된 동기부여 메시지

8. **AI 기반 개인화 추천**
   - 사용자 데이터 기반 우선순위 제안
   - 과제 성향 분석 (집중형/분산형 등)
   - 최적 학습 시간대 추천
   - 개인 맞춤형 일정 조율

### Phase 4: 백엔드 및 AI 시스템 구현

9. **Express 백엔드 서버 구축**
   - Node.js + Express 서버 초기 설정
   - SQLite 데이터베이스 연동
   - RESTful API 엔드포인트 설계
   - 파일 업로드/관리 시스템 구현

10. **데이터베이스 설계**
    - SQLite 스키마 설계 및 마이그레이션
    - 사용자, 할일, 파일, 채팅 테이블 구조
    - 데이터 관계 및 인덱스 최적화

11. **AI 시스템 통합**
    - OpenAI API 연동 및 환경변수 설정
    - AI 채팅 시스템 백엔드 구현
    - 과제 분석 엔진 (문서 파싱 + 단계별 분해)
    - 사용자 성향 분석 및 추천 알고리즘

12. **프론트엔드-백엔드 연동**
    - API 연동 및 데이터 동기화
    - 사용자 인증 및 세션 관리
    - 실시간 데이터 업데이트 (WebSocket 고려)

### Phase 5: Advanced Features
13. **투두비 성향별 계획 시스템** 🎯
    - **빡세게 미리미리**: 마감일 대비 여유있는 조기 완료 지향
    - **중간**: 적당한 여유와 효율성의 균형
    - **널널하게**: 마감일 맞춤 최소 계획 지향
    - 사용자 성향에 따른 마감일 기준 조정 (urgent/warning 기준점 변경)
    - 서브태스크 배치 전략 개인화

14. **스마트 알림 시스템**
    - 개인 패턴 학습 기반 알림
    - 집중 시간대 분석 및 추천

15. **성취 분석 대시보드**
    - 완료율 트렌드 분석
    - 생산성 패턴 인사이트

## Database Schema (SQLite)
- `tasks`: Main task storage with AI analysis results
- `subtasks`: Broken down task components
- `schedules`: AI-generated scheduling recommendations
- `completions`: Achievement ㄹ하이tracking for reward system

## Environment Variables Required

### Google Calendar API Setup
1. **Google Cloud Console 설정**
   - [Google Cloud Console](https://console.cloud.google.com/) 접속
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   - "APIs & Services" → "Library"에서 "Google Calendar API" 검색 및 활성화
   - "APIs & Services" → "Credentials"에서 "Create Credentials" → "API Key" 생성
   - "Create Credentials" → "OAuth 2.0 Client IDs" 생성 (Web application type)
   - Authorized JavaScript origins: `http://localhost:3000` 추가

2. **환경 변수 설정 (.env 파일)**
   ```env
   REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here.googleusercontent.com
   REACT_APP_GOOGLE_API_KEY=your_google_api_key_here
   ```

### 기타 환경 변수
- `REACT_APP_OPENAI_API_KEY`: AI task analysis and planning features용
- `PORT`: Backend server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)

## File Structure
```
ai-todo-app/
├── src/           # React frontend source
├── server/        # Express backend
├── public/        # Static assets
└── build/         # Production build output
```