# 🐼 AI Todo App

AI 기반 할일 관리 애플리케이션으로, 사용자의 메인 태스크를 분석하여 체계적인 서브태스크를 자동 생성하고 일정 관리까지 도와주는 스마트한 생산성 도구입니다.

<div align="center">
  <img src="public/todooby.png" alt="Todooby Mascot" width="100"/>
  <h3>🎯 효율적인 작업 분해 × 🧠 AI 분석 × 📅 스마트한 일정 관리</h3>
</div>

## ✨ 주요 기능

### 🤖 AI 기반 작업 분석
- **OpenAI GPT-4o** 엔진을 활용한 지능적인 작업 분석
- 복잡한 메인 태스크를 실행 가능한 서브태스크로 자동 분해
- 파일 업로드 및 웹 링크 분석을 통한 맞춤형 태스크 제안
- 사용자 요구사항과 난이도에 따른 개인화된 분석

### 📋 3단계 워크플로우
1. **중앙 패널**: 메인 태스크 생성 및 관리
2. **우측 패널**: AI 분석 및 서브태스크 제안
3. **좌측 패널**: 일별 스케줄링 및 진행상황 추적

### 🎨 직관적인 사용자 경험
- **실시간 인라인 편집**: 태스크명과 시간을 클릭해서 바로 수정
- **진행률 시각화**: 서브태스크 완료에 따른 실시간 진행률 계산
- **판다 캐릭터**: 귀여운 판다 아이콘으로 난이도와 상태 표시
- **반응형 디자인**: 모든 디바이스에서 최적화된 사용 경험

### 📝 스마트 메모 시스템
- 서브태스크별 개별 메모 작성 및 저장
- 한국어 입력 최적화
- 팝업 크기 자동 조절

### 📊 성과 분석 대시보드
- 일별/주별 완료율 통계
- 생산성 트렌드 분석
- 개인화된 동기부여 메시지

## 🏗️ 기술 스택

### Frontend
- **React 18** + **TypeScript** - 타입 안전한 사용자 인터페이스
- **TailwindCSS** - 유틸리티 우선 CSS 프레임워크
- **Framer Motion** - 부드러운 애니메이션과 사용자 피드백

### Backend
- **Node.js** + **Express** - RESTful API 서버
- **SQLite** - 경량 데이터베이스
- **TypeScript** - 백엔드 타입 안전성

### AI Integration
- **OpenAI GPT-4o** - 텍스트 분석 및 태스크 생성
- **GPT-4 Vision** - 이미지 및 문서 분석
- **스마트 프롬프트 엔지니어링** - 맥락에 맞는 서브태스크 생성

### Infrastructure
- **PM2** - 프로덕션 프로세스 관리
- **CORS** - 안전한 크로스 오리진 요청
- **환경변수 보안** - API 키 및 민감 정보 보호

## 🚀 빠른 시작

### 사전 요구사항
- **Node.js** 18.0.0 이상
- **npm** 8.0.0 이상
- **OpenAI API Key** ([OpenAI Platform](https://platform.openai.com/)에서 발급)

### 1. 저장소 클론
```bash
git clone https://github.com/wowsnu/ai-todo-app.git
cd ai-todo-app
```

### 2. 의존성 설치
```bash
# 프론트엔드 의존성 설치
npm install

# 백엔드 의존성 설치
cd server
npm install
cd ..
```

### 3. 환경변수 설정
```bash
# 백엔드 환경변수 파일 생성
cd server
cp .env.example .env

# .env 파일 편집 (OpenAI API 키 입력)
# OPENAI_API_KEY=your_api_key_here
# PORT=3001
```

### 4. 개발 서버 실행
```bash
# 터미널 1: 백엔드 서버 실행
cd server
npm run dev

# 터미널 2: 프론트엔드 서버 실행  
cd ..
npm start
```

### 5. 애플리케이션 접속

#### 🏠 로컬 개발환경
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:3001

#### 🌐 운영 환경 (Production)
- **프론트엔드**: https://ai-todo-app-gh8l.vercel.app
- **백엔드 API**: https://todooby.duckdns.org/api
- **도메인**: todooby.duckdns.org (DuckDNS 무료 도메인)

## 📁 프로젝트 구조

```
ai-todo-app/
├── 📁 public/                 # 정적 파일
│   ├── 🐼 analytics-panda.png  # AI 분석용 판다 아이콘
│   ├── 🐼 보통fanda.png         # 보통 난이도 판다
│   ├── 🐼 쉬는_fanda.png        # 쉬운 난이도 판다
│   ├── 🐼 엄격한fanda.png       # 어려운 난이도 판다
│   └── 🎯 todooby.png          # 메인 마스코트
├── 📁 src/                     # 프론트엔드 소스코드
│   ├── 📱 App.tsx              # 메인 애플리케이션 컴포넌트
│   ├── 🎨 App.css              # 스타일시트
│   ├── 📁 types/               # TypeScript 타입 정의
│   │   └── 📝 todo.ts          # Todo 관련 타입
│   └── 📁 services/            # API 서비스 레이어
├── 📁 server/                  # 백엔드 서버
│   ├── 🚀 server.ts            # Express 서버 엔트리포인트
│   ├── 🤖 aiService.js         # OpenAI API 통합
│   ├── 🔒 .env                 # 환경변수 (보안)
│   └── 📦 package.json         # 백엔드 의존성
├── 📖 README.md                # 프로젝트 문서
├── 📋 CLAUDE.md                # Claude Code 가이드
└── 📦 package.json             # 프론트엔드 의존성
```

## 🎯 사용 가이드

### 1. 메인 태스크 생성
1. 중앙 패널에서 "새 할일 추가" 클릭
2. 구체적인 작업 내용 입력 (예: "웹사이트 리뉴얼 프로젝트")
3. 마감일과 중요도 설정

### 2. AI 분석 및 서브태스크 생성
1. 생성된 메인 태스크 선택
2. 우측 패널에서 "투두비 분석" 클릭
3. 필요시 파일 업로드 또는 웹 링크 추가
4. 사용자 요구사항 입력 (선택사항)
5. 난이도 설정 (🐼 널널하게 / 🐼 보통 / 🐼 빡세게)
6. AI가 생성한 서브태스크 확인 및 수정

### 3. 일정 관리
1. 좌측 패널의 달력에서 날짜 선택
2. 생성된 서브태스크를 원하는 날짜로 드래그&드롭
3. 시간 설정 및 예상 소요시간 입력
4. 체크박스로 완료 표시

### 4. 메모 작성
1. 서브태스크 클릭하여 팝업 열기
2. 메모 영역에 상세 내용 작성
3. "💾 메모 저장" 버튼으로 저장

## 🔧 고급 설정

### 프로덕션 빌드
```bash
# 프론트엔드 빌드
npm run build

# 백엔드와 함께 프로덕션 실행
cd server
npm start
```

### PM2를 이용한 프로세스 관리
```bash
# PM2 설치
npm install -g pm2

# 백엔드 서버를 PM2로 실행
cd server
pm2 start server.ts --name "ai-todo-backend"

# 프론트엔드 빌드 서빙 (선택사항)
pm2 start "npm start" --name "ai-todo-frontend"

# PM2 상태 확인
pm2 status
```

### 도커 배포
```bash
# 도커 이미지 빌드
docker build -t ai-todo-app .

# 컨테이너 실행
docker run -p 3000:3000 -p 3001:3001 --env-file server/.env ai-todo-app
```

## 🌟 특별한 기능들

### 📊 진행률 계산 시스템
- 메인 태스크의 진행률은 연결된 모든 서브태스크의 완료율로 자동 계산
- 실시간 업데이트되는 시각적 진행률 표시
- 완료 시 축하 애니메이션과 투두비 리워드 시스템

### 🎨 개인화된 UI
- 사용자 성향에 따른 마감일 기준 조정
- 판다 캐릭터의 다양한 표정으로 상태 표현
- 다크모드 지원 (향후 업데이트 예정)

### 🔍 스마트 검색
- 태스크 제목, 내용, 메모 통합 검색
- 태그 기반 필터링
- 날짜 범위별 검색

## 🚀 배포 아키텍처

### 운영 환경 인프라
```
GitHub → GitHub Actions → AWS EC2 → Nginx → PM2 → Node.js
                ↓
             Vercel (Frontend)
```

### 자동 배포 프로세스
1. **main 브랜치 푸시** → GitHub Actions 트리거
2. **빌드 & 테스트** → 종속성 설치, TypeScript 컴파일
3. **EC2 배포** → SSH 접속, 코드 업데이트, PM2 재시작
4. **Health Check** → API 상태 확인
5. **SSL 인증서** → Let's Encrypt 자동 갱신

### 환경 변수 관리
- **개발환경**: `.env` 파일
- **운영환경**: GitHub Actions Secrets → PM2 ecosystem.config.js
- **보안**: 모든 민감 정보는 암호화된 상태로 관리

### 도메인 및 SSL
- **무료 도메인**: DuckDNS (todooby.duckdns.org)
- **SSL 인증서**: Let's Encrypt (3개월 자동 갱신)
- **보안 등급**: A+ (SSL Labs)

## 🤝 기여하기

프로젝트 개선에 참여하고 싶으시다면:

1. **Fork** 저장소
2. **Feature Branch** 생성 (`git checkout -b feature/AmazingFeature`)
3. **Commit** 변경사항 (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to Branch (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 개발 가이드라인
- TypeScript 사용 권장
- ESLint 규칙 준수
- 컴포넌트별 테스트 코드 작성
- 커밋 메시지는 [Conventional Commits](https://conventionalcommits.org/) 형식 사용

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🆘 문제 해결

### 자주 묻는 질문

**Q: OpenAI API 키는 어디서 발급받나요?**
A: [OpenAI Platform](https://platform.openai.com/api-keys)에서 계정 생성 후 API 키를 발급받을 수 있습니다.

**Q: 서버가 시작되지 않아요.**
A: `.env` 파일이 올바르게 설정되었는지 확인하고, `npm install`로 의존성이 모두 설치되었는지 확인하세요.

**Q: AI 분석이 작동하지 않아요.**
A: OpenAI API 키가 유효한지, 크레딧이 남아있는지 확인하세요. 콘솔에서 에러 메시지를 확인해보세요.

### 지원
- 🐛 **버그 신고**: [GitHub Issues](https://github.com/wowsnu/ai-todo-app/issues)
- 💡 **기능 제안**: [GitHub Discussions](https://github.com/wowsnu/ai-todo-app/discussions)
- 📧 **직접 연락**: [이메일로 문의]

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움으로 만들어졌습니다:
- [React](https://reactjs.org/) - 사용자 인터페이스 라이브러리
- [OpenAI](https://openai.com/) - AI 분석 엔진
- [TailwindCSS](https://tailwindcss.com/) - CSS 프레임워크
- [Express](https://expressjs.com/) - 웹 애플리케이션 프레임워크

---

<div align="center">
  <img src="public/todooby.png" alt="Todooby" width="50"/>
  <br>
  <strong>Made with ❤️ by AI Todo App Team</strong>
  <br>
  <em>"똑똑한 할일 관리로 더 나은 하루를 만들어보세요!"</em>
</div>