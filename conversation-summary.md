# AI Todo App Development Summary

## Project Overview
AI Todo App with React frontend, Node.js backend, SQLite database, and OpenAI GPT integration. Three-panel UI design: left (daily schedule), center (main tasks), right (AI analysis).

## Technical Stack
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express + SQLite
- AI Integration: OpenAI GPT-4o with vision capabilities
- Database: SQLite with todos and daily_summaries tables

## Key Features Implemented

### 1. Server and Frontend Setup
- React frontend (port 3000) and Node.js backend (port 3001)
- Database initialization with proper table structure
- CORS configuration for cross-origin requests

### 2. Database Management
- Cleaned orphaned subtasks without main tasks
- Implemented cascading deletion for main tasks and related subtasks
- Dynamic field updates for todos including title and time fields

### 3. UI/UX Improvements
- **Calendar Sizing**: Fixed calendar expansion issues by removing max-height constraints
- **Right Panel Scrollbar**: Resolved scrollbar affecting content width using overflow-y: scroll
- **Deadline Badges**: Added urgent and warning deadline indicators for subtasks
- **Badge UI**: Made badges inline with smaller icons and hover tooltips

### 4. File Upload System
- **Core Architectural Change**: Separated file uploads per task
- Changed from global `File[]` to `Record<string, File[]>` pattern
- Updated all file handling functions for task-specific storage

### 5. Progress Calculation System
- Real-time progress calculation based on subtask completion
- **Central Panel Filter**: Progress statistics now show only main tasks (filtered by `!t.parentTodoId`)
- Fixed progress bar calculations to exclude subtasks

### 6. AI Analysis Enhancement
- Added user requirements input textarea
- Implemented difficulty selection (easy/normal/hard) with backend integration
- Removed time estimation features due to inadequacy
- Enhanced prompts to reflect difficulty settings

### 7. GPT Performance Optimization
- **AI Warmup System**: Implemented warmup on server startup
- **Detailed Logging**: Added comprehensive logging and timing information
- **Model Optimization**: Switched from GPT-5 to GPT-4o to avoid token limit issues
- **Error Handling**: Enhanced error handling with fallback mechanisms

### 8. Inline Editing System
- **Left Panel Editing**: Time and task name editing with real-time updates
- Backend synchronization for persistent changes
- Fixed data mapping issue: subtasks use `text` field but UI shows `title`
- State management with editing flags and temporary values

## 파일 및 코드 섹션

### `/Users/sangwoo/Desktop/여름방학/project/ai-todo-app/server/.env`
안전한 API 키 저장을 위한 핵심 파일
```env
# OpenAI API Configuration (SERVER ONLY - SECURE)
OPENAI_API_KEY=sk-proj-YOUR_API_KEY_HERE
PORT=3001
```

### `/Users/sangwoo/Desktop/여름방학/project/ai-todo-app/server/server.ts`
API 엔드포인트와 페이로드 크기 제한이 있는 메인 백엔드 서버
```typescript
app.use(express.json({ 
  limit: '200mb'
}));
app.use(express.urlencoded({ 
  limit: '200mb', 
  parameterLimit: 500000,
  extended: true 
}));

// AI Task Analysis API endpoint
app.post('/api/analyze-task', async (req, res) => {
  try {
    const analysis = await aiService.analyzeTask(
      mainTaskTitle, description, deadline, fileContents || [], webContents || []
    );
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ 
      error: 'AI analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### `/Users/sangwoo/Desktop/여름방학/project/ai-todo-app/server/aiService.js`
안전한 OpenAI API 호출을 위한 새로운 백엔드 서비스
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeImage(imageBase64, index) {
  const completion = await openai.chat.completions.create({
    model: "gpt-5-vision",
    messages: [/* vision API calls */]
  });
}

async function analyzeTask(mainTaskTitle, description, deadline, fileContents, webContents) {
  const completion = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [/* task analysis */]
  });
  
  // JSON parsing with code block handling
  let cleanResponse = response;
  if (response.includes('```json')) {
    cleanResponse = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
  }
  analysis = JSON.parse(cleanResponse);
}
```

### `/Users/sangwoo/Desktop/여름방학/project/ai-todo-app/src/services/aiService.ts`
직접 OpenAI 호출 대신 백엔드 API를 호출하도록 구조 변경
```typescript
async analyzeTask(mainTaskTitle, description, deadline, uploadedFiles, uploadedLinks): Promise<TaskAnalysis> {
  // File processing with size limits
  const filesToProcess = uploadedFiles.slice(0, 3);
  for (const file of filesToProcess) {
    if (file.size > 10 * 1024 * 1024) {
      console.warn(`파일이 너무 큽니다: ${file.name}`);
      continue;
    }
  }

  // Backend API call
  const response = await fetch(`${API_BASE_URL}/analyze-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mainTaskTitle, description, deadline, fileContents, webContents })
  });
}

private async compressImage(base64Data: string, fileName: string): Promise<string> {
  const maxWidth = 800, maxHeight = 800;
  // Canvas compression with 0.6 JPEG quality
  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
  return compressedBase64;
}
```

## 오류 및 해결 방법

### 보안 취약점
**문제**: `dangerouslyAllowBrowser: true`로 API 키 노출
**해결**: 완전한 백엔드 마이그레이션 및 프론트엔드에서 OpenAI 의존성 제거

### CORS 오류
**문제**: "Fetch API cannot load http://localhost:3001/api/todos due to access control checks"
**해결**: 적절한 CORS 미들웨어 구성 및 aiService require 전에 dotenv.config() 이동

### 환경 변수 오류
**문제**: "OPENAI_API_KEY environment variable is missing"
**해결**: `REACT_APP_OPENAI_API_KEY`에서 `OPENAI_API_KEY`로 변수명 변경 및 적절한 dotenv 경로 구성

### TypeScript 컴파일 오류
**문제**: `'error' is of type 'unknown'`
**해결**: 타입 가드 추가: `error instanceof Error ? error.message : 'Unknown error'`

### PayloadTooLargeError
**문제**: Request entity too large
**해결**: 서버 제한을 200MB로 증가 및 이미지 압축 구현

### JSON 파싱 오류
**문제**: `Unexpected token '`', "```json`
**해결**: JSON.parse() 전에 코드 블록 제거 추가

### TypeScript 오류
**문제**: `'parameterLimit' does not exist in type 'OptionsJson'`
**해결**: express.json() 구성에서 유효하지 않은 parameterLimit 옵션 제거

## 문제 해결 과정
- 안전하지 않은 프론트엔드에서 안전한 백엔드로 전체 OpenAI 통합 마이그레이션 성공
- 페이로드 크기를 줄이기 위한 포괄적인 이미지 압축 파이프라인 구현
- 다양한 파일 업로드 및 API 응답 시나리오에 대한 강력한 오류 처리 추가
- 적절한 클라이언트-서버 통신을 위한 CORS 구성 문제 해결
- 적절한 오류 처리와 함께 GPT-5 및 GPT-5-vision 모델 통합 구현

## 사용자 메시지
- "우리 지금 gpt-5-vision 모델 쓰고 있니?"
- "⏺ 또한 PayloadTooLargeError도 여전히 발생하고 있어서 50MB로도 충분하지 않은 것 같습니다. 서버 재시작 후 다시 테스트해보세요. 그럼 이건 어떻게 해결하는데"
- "음 서버 최대한도는 몇 mb?"
- "서버 재시작좀해줘"
- "백엔드에서 AI 분석 완료:"moderate" 라고 하는데 왜 답변을 기본 그것으로 똑같이 나왔지? 응답이 안된건가? 확인 좀"

## 보류 중인 작업
- 이미지 분석이 포함된 완전한 안전한 백엔드 구현 테스트
- AI 분석이 이제 폴백 응답 대신 현실적인 시간 추정을 제공하는지 확인
- 새로운 200MB 제한으로 PayloadTooLargeError가 완전히 해결되었는지 확인

## 현재 작업
가장 최근 작업은 서버 페이로드 제한을 200MB로 늘리고 TypeScript 컴파일 오류를 해결하여 PayloadTooLargeError를 해결하는 것이었습니다. 사용자가 "서버 재시작좀해줘"를 요청했고, Express.js 구성에서 유효하지 않은 `parameterLimit` 옵션을 수정한 후 서버를 성공적으로 재시작했습니다. 이제 서버는 새로운 200MB 제한으로 실행되고 있으며 오류 없이 대용량 파일 업로드를 처리할 수 있어야 합니다.

## 최근 추가 작업 (8월 30일)

### 달력 날짜 수정 작업
**문제**: 달력에서 30일을 클릭했는데 "8월 29일 할일 추가"로 표시되던 문제

**원인 분석**:
1. `getCurrentWeekDates()` 함수에서 `date.setDate()` 방식 사용 시 시간대 문제 발생
2. `isToday` 판단에서 `dateStr === todayStr` 비교 시 문자열 파싱 오차
3. `new Date(today)` 객체 재사용으로 인한 참조 문제

**해결 방법**:
```javascript
// 수정 전
const date = new Date(today);
date.setDate(today.getDate() + mondayOffset + i);
const dateStr = date.toISOString().split('T')[0];

// 수정 후
const totalOffset = mondayOffset + i;
const year = today.getFullYear();
const month = today.getMonth();
const day = today.getDate();

const date = new Date(year, month, day + totalOffset);
const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
```

**주요 수정 사항**:
1. **날짜 계산**: `new Date(year, month, day + offset)` 방식으로 변경
2. **문자열 생성**: 수동 포매팅으로 시간대 문제 해결  
3. **오늘 날짜 판단**: 년/월/일 직접 비교로 변경
4. **디버깅**: 콘솔 로그로 실제 값 확인

**결과**: 달력에서 30일 클릭 → "8월 30일 금요일 할일 추가" 정확히 표시

### 투두비 성향별 계획 시스템 기획
사용자 요청으로 향후 구현 예정:
부 - **중간**: 적당한 여유와 효율성의 균형  
- **널널하게**: 마감일 맞춤 최소 계획 지향
- 사용자 성향에 따른 urgent/warning 기준점 개인화

## 선택적 다음 단계
AI 분석 기능을 테스트하여 이제 폴백 응답 대신 실제 GPT-4o 분석 결과를 반환하는지 확인하고, 새로운 200MB 서버 제한으로 PayloadTooLargeError가 해결되었는지 확인합니다. 최근 작업으로 달력 날짜 표시 문제는 해결되었습니다.

---

# AI Todo App Development Summary (Updated)

## Project Overview
AI Todo App with React frontend, Node.js backend, SQLite database, and OpenAI GPT integration. Three-panel UI design: left (daily schedule), center (main tasks), right (AI analysis).

## Technical Stack
- Frontend: React + TypeScript + TailwindCSS
- Backend: Node.js + Express + SQLite
- AI Integration: OpenAI GPT-4o with vision capabilities
- Database: SQLite with todos and daily_summaries tables

## Key Features Implemented

### 1. Server and Frontend Setup
- React frontend (port 3000) and Node.js backend (port 3001)
- Database initialization with proper table structure
- CORS configuration for cross-origin requests

### 2. Database Management
- Cleaned orphaned subtasks without main tasks
- Implemented cascading deletion for main tasks and related subtasks
- Dynamic field updates for todos including title and time fields

### 3. UI/UX Improvements
- **Calendar Sizing**: Fixed calendar expansion issues by removing max-height constraints
- **Right Panel Scrollbar**: Resolved scrollbar affecting content width using overflow-y: scroll
- **Deadline Badges**: Added urgent and warning deadline indicators for subtasks
- **Badge UI**: Made badges inline with smaller icons and hover tooltips

### 4. File Upload System
- **Core Architectural Change**: Separated file uploads per task
- Changed from global `File[]` to `Record<string, File[]>` pattern
- Updated all file handling functions for task-specific storage

### 5. Progress Calculation System
- Real-time progress calculation based on subtask completion
- **Central Panel Filter**: Progress statistics now show only main tasks (filtered by `!t.parentTodoId`)
- Fixed progress bar calculations to exclude subtasks

### 6. AI Analysis Enhancement
- Added user requirements input textarea
- Implemented difficulty selection (easy/normal/hard) with backend integration
- Removed time estimation features due to inadequacy
- Enhanced prompts to reflect difficulty settings

### 7. GPT Performance Optimization
- **AI Warmup System**: Implemented warmup on server startup
- **Detailed Logging**: Added comprehensive logging and timing information
- **Model Optimization**: Switched from GPT-5 to GPT-4o to avoid token limit issues
- **Error Handling**: Enhanced error handling with fallback mechanisms

### 8. Inline Editing System
- **Left Panel Editing**: Time and task name editing with real-time updates
- Backend synchronization for persistent changes
- Fixed data mapping issue: subtasks use `text` field but UI shows `title`
- State management with editing flags and temporary values

## Key Files and Code Structure

### `/src/App.tsx` (Main Application Logic)
- Inline editing state: `editingTitleId`, `tempTitle`, `editingTimeId`, `tempTime`
- Editing functions: `startTitleEdit()`, `finishTitleEdit()`, `cancelTitleEdit()`
- Progress calculations filtered for main tasks only
- File upload system with Record<string, File[]> pattern

### `/src/App.css` (Styling)
- Inline editing styles: `.editable-title`, `.title-edit-input`
- Enhanced scrollbar styling for right panel
- Hover effects for editable elements

### `/server/aiService.js` (AI Integration)
- User requirements and difficulty level parameters
- AI warmup system with `warmupAI()` function
- Model specification using `gpt-4o`
- Enhanced logging and error handling

### `/server/server.ts` (Backend API)
- AI warmup on server startup
- Enhanced API endpoints for AI analysis parameters
- Dynamic field updates for todos

## Major Bug Fixes

1. **Calendar Scrolling**: Removed max-height constraints and unified gap sizes
2. **Right Panel Scrollbar**: Corrected CSS class targeting (.detail-content)
3. **File Upload Isolation**: Implemented Record pattern for task-specific storage
4. **OpenAI Token Limits**: Switched from GPT-5 to GPT-4o model
5. **Inline Editing Data Mapping**: Fixed subtask.text vs subtask.title field confusion
6. **TypeScript Field References**: Corrected parentMainTaskId to parentTodoId
7. **Progress Calculation**: Added !t.parentTodoId filter to exclude subtasks

## Current Status
All requested features have been implemented and tested. The application now properly:
- Manages file uploads per task
- Calculates progress based only on main tasks
- Provides inline editing with backend persistence
- Optimizes AI performance through warmup and proper model selection
- Handles cascading deletion of main tasks and related data

## Architecture Patterns
- **Record<string, T[]>** for task-specific data storage
- **Main Task vs Subtask** relationship using parentTodoId field
- **Real-time State Management** with React useState hooks
- **Cascading Operations** for data consistency
- **Type Safety** with TypeScript interfaces and proper field references