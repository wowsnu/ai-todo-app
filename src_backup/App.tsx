import React, { useState, useEffect } from 'react';
import './App.css';
import { googleCalendarService } from './services/googleCalendar';
import { apiService, DailySummary } from './services/api';
import { TodoData } from './types/todo';
import { aiService, TaskAnalysis } from './services/aiService';

// UI와 완전 호환되는 Todo 인터페이스 (원래 디자인 유지)
interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  time: string; // 일정 시간 (예: "09:00")
  date?: string; // 일정 날짜 (예: "2025-08-28")
  estimatedDuration: number; // 예상 소요시간 (분 단위)
  parentMainTaskId: string; // 어떤 Main Task의 서브태스크인지
}

interface Todo {
  id: string;
  time: string;
  title: string;
  text: string; // title과 동일하지만 UI 호환성을 위해 유지
  description: string;
  location: string;
  isFromCalendar: boolean;
  progress: number; // 0-100
  deadline: string; // YYYY-MM-DD 형식
  parentTodoId: string | null;
  completed: boolean; // progress === 100
  status: 'active' | 'paused' | 'completed';
  subtasks?: Subtask[];
}

// API Todo를 UI Todo로 변환하는 유틸리티
const apiTodoToUiTodo = (todoData: TodoData): Todo => {
  return {
    id: todoData.id,
    time: todoData.time,
    title: todoData.title,
    text: todoData.title, // title과 text 동일하게 유지
    description: todoData.description,
    location: todoData.location,
    isFromCalendar: todoData.isFromCalendar,
    progress: todoData.progress,
    deadline: todoData.deadline,
    parentTodoId: todoData.parentTodoId,
    completed: todoData.progress === 100,
    status: todoData.status || 'active' // API에서 가져온 상태 사용, 없으면 active
  };
};



function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  // const [aiSuggestion, setAiSuggestion] = useState('');
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  
  // 투두비 지니 리워드 시스템
  const [showReward, setShowReward] = useState(false);
  const [rewardData, setRewardData] = useState<{
    mainTask: Todo | null;
    completedSubtasks: number;
    totalSubtasks: number;
  }>({ mainTask: null, completedSubtasks: 0, totalSubtasks: 0 });
  const [selectedReward, setSelectedReward] = useState('');

  
  // 보상 선택지
  const rewardOptions = [
    { id: 'coffee', emoji: '☕', text: '맛있는 커피 한 잔' },
    { id: 'dessert', emoji: '🍰', text: '달콤한 디저트' },
    { id: 'game', emoji: '🎮', text: '게임 시간' },
    { id: 'bath', emoji: '🛀', text: '편안한 목욕' },
    { id: 'movie', emoji: '🎬', text: '영화 한 편' },
    { id: 'music', emoji: '🎵', text: '좋아하는 음악' },
    { id: 'walk', emoji: '🚶', text: '산책하기' },
    { id: 'custom', emoji: '✍️', text: '직접 입력하기' }
  ];
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  // 왼쪽 패널 드래그 앤 드롭 상태
  const [draggedDailyTask, setDraggedDailyTask] = useState<string | null>(null);
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // 현재 주간 계산 함수
  const getCurrentWeekString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    return `${year}년 ${month}월 ${date}일 주간`;
  };

  // 현재 주의 날짜들을 계산하는 함수 (확장 가능)
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const dates = [];
    
    if (isCalendarExpanded) {
      // 확장된 달력: 현재 주 + 아래 3주 (총 4주)
      for (let weekOffset = 0; weekOffset <= 3; weekOffset++) {
        for (let i = 0; i < 7; i++) {
          const totalOffset = mondayOffset + (weekOffset * 7) + i;
          const year = today.getFullYear();
          const month = today.getMonth();
          const day = today.getDate();
          
          const date = new Date(year, month, day + totalOffset);
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          
          dates.push({
            dateStr,
            dayNum: date.getDate(),
            isToday: date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear(),
            month: date.getMonth() + 1,
            isNewWeek: i === 0
          });
        }
      }
    } else {
      // 기본 달력: 현재 주만
      for (let i = 0; i < 7; i++) {
        const totalOffset = mondayOffset + i;
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = today.getDate();
        
        const date = new Date(year, month, day + totalOffset);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        dates.push({
          dateStr,
          dayNum: date.getDate(),
          isToday: date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
        });
      }
    }
    
    return dates;
  };


  const [dailyTaskOrder, setDailyTaskOrder] = useState<string[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quickInputText, setQuickInputText] = useState('');
  const [subtaskPopup, setSubtaskPopup] = useState<{show: boolean, subtask: any, mainTask: Todo | null}>({
    show: false,
    subtask: null,
    mainTask: null
  });
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  // const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [summaryTooltip, setSummaryTooltip] = useState<{show: boolean, content: any | null, position: {x: number, y: number}}>({
    show: false,
    content: null,
    position: {x: 0, y: 0}
  });
  
  // 일일 요약 데이터 (날짜별 성과 추적)  
  const [dailySummaries, setDailySummaries] = useState<Record<string, DailySummary>>({});
  
  // 서브태스크 상태 - Main Task별로 관리되는 실제 서브태스크들
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  
  // 시간 편집 상태
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [tempTime, setTempTime] = useState('');
  
  // 통합 자료 업로드 상태 (파일 + 링크) - 메인태스크별로 분리
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [uploadedLinks, setUploadedLinks] = useState<Record<string, string[]>>({});
  const [linkInput, setLinkInput] = useState('');
  
  // AI 분석 관련 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TaskAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [tempDailySummaries] = useState({
    '2025-08-22': {
      completedTasks: 5,
      totalTasks: 5,
      completionRate: 100,
      badge: 'perfect',
      mood: 'excellent'
    },
    '2025-08-23': {
      completedTasks: 2,
      totalTasks: 4,
      completionRate: 50,
      badge: 'progress',
      mood: 'good'
    },
    '2025-08-24': {
      completedTasks: 1,
      totalTasks: 6,
      completionRate: 17,
      badge: 'start',
      mood: 'challenging'
    }
  });

  // 선택된 날짜의 서브태스크들을 표시 (실제 일정)
  const getDailyTasks = () => {
    if (!selectedDate) return [];
    
    // 선택된 날짜에 해당하는 서브태스크만 필터링
    const filteredSubtasks = subtasks.filter(subtask => {
      // AI가 지정한 날짜가 있으면 그 날짜 사용, 없으면 오늘 날짜 사용
      const subtaskDate = subtask.date || new Date().toISOString().split('T')[0];
      return subtaskDate === selectedDate;
    });
    
    const dailySubtasks = filteredSubtasks.map(subtask => ({
      id: subtask.id,
      time: subtask.time,
      title: subtask.text,
      progress: subtask.completed ? 100 : 0,
      deadline: subtask.date || selectedDate,
      completed: subtask.completed,
      estimatedDuration: subtask.estimatedDuration,
      parentMainTaskId: subtask.parentMainTaskId,
      date: subtask.date
    }));

    // 저장된 순서가 있으면 그 순서대로 정렬, 없으면 시간순 정렬
    const dailyTasksForDate = dailyTaskOrder.filter(taskId => 
      dailySubtasks.some(task => task.id === taskId)
    );
    
    if (dailyTasksForDate.length > 0) {
      const orderedTasks = [];
      const tasksMap = new Map(dailySubtasks.map(task => [task.id, task]));
      
      // 저장된 순서대로 먼저 배치
      for (const taskId of dailyTasksForDate) {
        if (tasksMap.has(taskId)) {
          orderedTasks.push(tasksMap.get(taskId)!);
          tasksMap.delete(taskId);
        }
      }
      
      // 새로 추가된 할일들은 뒤에 추가
      orderedTasks.push(...Array.from(tasksMap.values()));
      
      return orderedTasks;
    }
    
    // 기본 시간순 정렬
    return dailySubtasks.sort((a, b) => a.time.localeCompare(b.time));
  };

  // 특정 날짜에 서브태스크가 있는지 확인하는 함수
  const hasSubtasksOnDate = (dateString: string) => {
    return subtasks.some(subtask => {
      const subtaskDate = subtask.date || new Date().toISOString().split('T')[0];
      return subtaskDate === dateString;
    });
  };

  // 특정 날짜의 서브태스크 개수를 반환하는 함수
  const getSubtaskCountOnDate = (dateString: string) => {
    return subtasks.filter(subtask => {
      const subtaskDate = subtask.date || new Date().toISOString().split('T')[0];
      return subtaskDate === dateString;
    }).length;
  };

  // 특정 날짜의 완료된 서브태스크 개수를 반환하는 함수
  const getCompletedSubtaskCountOnDate = (dateString: string) => {
    return subtasks.filter(subtask => {
      const subtaskDate = subtask.date || new Date().toISOString().split('T')[0];
      return subtaskDate === dateString && subtask.completed;
    }).length;
  };

  // 마감일 기반으로 긴급도 판단하는 함수
  const getDeadlineUrgency = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'urgent';
    if (diffDays <= 1) return 'warning';
    return 'normal';
  };

  // 서브태스크의 메인 태스크를 찾는 함수
  const getMainTaskForSubtask = (subtask: any) => {
    return todos.find(todo => todo.id === subtask.parentMainTaskId);
  };

  // 서브태스크의 마감 긴급도를 메인 태스크 기준으로 판단하는 함수
  const getSubtaskDeadlineUrgency = (subtask: any) => {
    const mainTask = getMainTaskForSubtask(subtask);
    if (!mainTask || !mainTask.deadline) return 'normal';
    
    // 서브태스크가 메인태스크의 마감일 당일에 스케줄되어 있으면 urgent로 표시
    if (subtask.date && subtask.date === mainTask.deadline) {
      return 'urgent';
    }
    
    return getDeadlineUrgency(mainTask.deadline);
  };

  // 서브태스크 클릭 핸들러
  const handleSubtaskClick = (dailyTask: any) => {
    // dailyTask의 parentMainTaskId로 실제 Main Task를 찾음
    const mainTask = todos.find(todo => todo.id === dailyTask.parentMainTaskId);
    if (mainTask) {
      // subtask 원본 데이터를 찾음
      const originalSubtask = subtasks.find(st => st.id === dailyTask.id);
      
      setSubtaskPopup({
        show: true,
        subtask: {
          id: dailyTask.id,
          title: dailyTask.title,
          time: dailyTask.time,
          progress: dailyTask.progress,
          estimatedDuration: dailyTask.estimatedDuration || originalSubtask?.estimatedDuration || 60
        },
        mainTask: mainTask
      });
    }
  };

  // 팝업 닫기
  const closeSubtaskPopup = () => {
    setSubtaskPopup({
      show: false,
      subtask: null,
      mainTask: null
    });
  };

  // 리워드 팝업 닫기
  const closeRewardPopup = () => {
    setShowReward(false);
    setSelectedReward('');
    setRewardData({ mainTask: null, completedSubtasks: 0, totalSubtasks: 0 });
  };

  // 보상 선택 및 확인
  const confirmReward = () => {
    if (selectedReward) {
      const selectedOption = rewardOptions.find(option => option.id === selectedReward);
      if (selectedOption) {
        alert(`🎉 축하합니다! "${selectedOption.text}"을(를) 즐겨보세요! 수고하셨습니다! 🎊`);
      }
      closeRewardPopup();
    }
  };


  // 뱃지 렌더링 함수
  const renderDayBadge = (badge: string) => {
    const badges = {
      'perfect': '🏆', // 100% 완료
      'great': '⭐', // 80-99% 완료
      'good': '✨', // 60-79% 완료  
      'progress': '📈', // 30-59% 완료
      'start': '🌱', // 1-29% 완료
      'rest': '😴' // 0% 완료 또는 휴식일
    };
    return badges[badge as keyof typeof badges] || '';
  };

  // 날짜별 요약 데이터 가져오기
  const getDailySummary = (dateString: string) => {
    return (dailySummaries as any)[dateString] || null;
  };


  // 뱃지 호버 이벤트
  const handleBadgeHover = (e: React.MouseEvent, summary: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSummaryTooltip({
      show: true,
      content: summary,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      }
    });
  };

  // 뱃지 호버 종료 이벤트
  const handleBadgeLeave = () => {
    setSummaryTooltip({
      show: false,
      content: null,
      position: {x: 0, y: 0}
    });
  };

  // 성과 메시지 생성
  const getPerformanceMessage = (summary: any): string => {
    const messages = {
      'perfect': `🎉 완벽한 하루! ${summary.completedTasks}/${summary.totalTasks} 모두 완료`,
      'great': `⭐ 훌륭해요! ${summary.completedTasks}/${summary.totalTasks} 완료 (${summary.completionRate}%)`,
      'good': `✨ 좋은 진전! ${summary.completedTasks}/${summary.totalTasks} 완료 (${summary.completionRate}%)`,
      'progress': `📈 꾸준한 진행! ${summary.completedTasks}/${summary.totalTasks} 완료 (${summary.completionRate}%)`,
      'start': `🌱 시작이 반! ${summary.completedTasks}/${summary.totalTasks} 완료 (${summary.completionRate}%)`,
      'rest': `😴 휴식일 또는 계획된 일이 없었어요`
    };
    return (messages as any)[summary.badge] || '알 수 없는 상태';
  };

  // 구글 캘린더 연동 초기화
  useEffect(() => {
    const initGoogleCalendar = async () => {
      try {
        await googleCalendarService.initializeGapi();
        setGoogleCalendarConnected(googleCalendarService.isUserSignedIn());
      } catch (error) {
        console.error('Failed to initialize Google Calendar:', error);
      }
    };

    initGoogleCalendar();
  }, []);

  // API에서 todos와 daily summaries 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Todos 로드 (API Todo를 UI Todo로 변환)
        const apiTodos = await apiService.getTodos();
        const uiTodos = apiTodos.map(apiTodoToUiTodo);
        
        // Main Task와 서브태스크를 분리
        const mainTasks = apiTodos.filter(todo => !todo.parentTodoId);
        const subtaskData = apiTodos.filter(todo => todo.parentTodoId);
        
        // 서브태스크를 UI 형식으로 변환
        const loadedSubtasks: Subtask[] = subtaskData.map(apiTodo => ({
          id: apiTodo.id,
          text: apiTodo.title,
          completed: apiTodo.progress === 100,
          completedAt: apiTodo.progress === 100 ? new Date() : undefined,
          time: apiTodo.time || '09:00',
          date: apiTodo.date || new Date().toISOString().split('T')[0],
          estimatedDuration: apiTodo.estimatedDuration || 60,
          parentMainTaskId: apiTodo.parentTodoId!
        }));
        
        setTodos(uiTodos);
        
        console.log('📊 서버에서 로드된 데이터:');
        console.log(`- Main Tasks: ${mainTasks.length}개`);
        console.log(`- Subtasks: ${loadedSubtasks.length}개`);
        
        // Daily summaries 로드
        const summariesData = await apiService.getDailySummaries();
        const summariesMap = summariesData.reduce((acc, summary) => {
          acc[summary.date] = summary;
          return acc;
        }, {} as Record<string, DailySummary>);
        setDailySummaries(summariesMap);
        
        // 예시 Main Task를 위해 기존 todos 중 일부를 Main Task로 지정하거나 새로 생성
        const mainTaskIds: string[] = [];
        let updatedTodos = [...uiTodos];
        
        if (uiTodos.length > 0) {
          // 기존 todos 중 처음 두 개를 Main Task로 지정
          updatedTodos = uiTodos.map((todo, index) => {
            if (index < 2) {
              mainTaskIds.push(todo.id);
            }
            return todo;
          });
        }
        
        setTodos(updatedTodos);
        
        const firstMainTaskId = mainTaskIds[0];
        const secondMainTaskId = mainTaskIds[1];
        
        // 서브태스크 설정 - 서버에서 로드된 것이 있으면 사용, 없으면 예시 생성
        if (loadedSubtasks.length > 0) {
          setSubtasks(loadedSubtasks);
        } else if (mainTaskIds.length > 0) {
          // 예시 서브태스크 생성 (실제로는 AI가 Main Task 분석하여 생성)
          const exampleSubtasks: Subtask[] = [
            {
              id: 'subtask-1',
              text: '프로젝트 요구사항 분석하기',
              completed: false,
              time: '09:00',
              date: new Date().toISOString().split('T')[0],
              estimatedDuration: 60,
              parentMainTaskId: firstMainTaskId
            },
            {
              id: 'subtask-2', 
              text: '시장 조사 및 자료 수집',
              completed: false,
              time: '10:30',
              date: new Date().toISOString().split('T')[0],
              estimatedDuration: 90,
              parentMainTaskId: firstMainTaskId
            },
            {
              id: 'subtask-3',
              text: '초안 작성 시작',
              completed: false,
              time: '14:00',
              date: new Date().toISOString().split('T')[0],
              estimatedDuration: 120,
              parentMainTaskId: firstMainTaskId
            },
            {
              id: 'subtask-4',
              text: '코드 리뷰 준비',
              completed: true,
              time: '09:30',
              date: new Date().toISOString().split('T')[0],
              estimatedDuration: 30,
              parentMainTaskId: secondMainTaskId
            }
          ];
          setSubtasks(exampleSubtasks);
        }
        
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 구글 캘린더 로그인
  const handleGoogleCalendarSignIn = async () => {
    setIsLoadingCalendar(true);
    try {
      const success = await googleCalendarService.signIn();
      if (success) {
        setGoogleCalendarConnected(true);
        await loadCalendarEvents();
      }
    } catch (error) {
      console.error('Failed to sign in to Google Calendar:', error);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // 구글 캘린더 로그아웃
  const handleGoogleCalendarSignOut = async () => {
    try {
      await googleCalendarService.signOut();
      setGoogleCalendarConnected(false);
      // setCalendarEvents([]);
    } catch (error) {
      console.error('Failed to sign out from Google Calendar:', error);
    }
  };

  // 캘린더 이벤트 로드
  const loadCalendarEvents = async () => {
    if (!googleCalendarConnected) return;

    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // 이번 주 일요일

      // const events = await googleCalendarService.getWeeklyEvents(weekStart);
      // setCalendarEvents(events);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    }
  };

  const addTodo = async () => {
    console.log('🔍 addTodo called with inputText:', inputText);
    
    if (inputText.trim() !== '') {
      try {
        const newTodo = {
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          title: inputText.trim(),
          description: '',
          location: '',
          isFromCalendar: false,
          progress: 0,
          deadline: '',
          parentTodoId: null,
          status: 'active'
        };
        
        console.log('📤 Sending todo to API:', newTodo);
        const apiTodo = await apiService.createTodo(newTodo);
        console.log('📥 Received from API:', apiTodo);
        
        // API Todo를 UI Todo로 변환하여 로컬 상태에 추가
        const uiTodo = apiTodoToUiTodo(apiTodo);
        console.log('🔄 Converted to UI todo:', uiTodo);
        
        setTodos(prev => {
          console.log('📝 Adding to todos list. Current count:', prev.length);
          return [...prev, uiTodo];
        });
        setInputText('');
        console.log('✅ Todo added successfully');
        
      } catch (error) {
        console.error('❌ Failed to add todo:', error);
      }
    } else {
      console.log('⚠️ Empty input text, not adding todo');
    }
  };

  const addQuickTodo = async () => {
    if (quickInputText.trim() !== '') {
      try {
        const newTodoData = {
          title: quickInputText.trim(),
          time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
          description: '',
          location: '',
          isFromCalendar: false,
          progress: 0,
          deadline: selectedDate || '',
          parentTodoId: null,
          status: 'active'
        };
        
        const apiTodo = await apiService.createTodo(newTodoData);
        const uiTodo = apiTodoToUiTodo(apiTodo);
        
        // 항목들을 상태별로 분리
        const activeTodos = todos.filter(todo => todo.status === 'active' && !todo.completed);
        const pausedTodos = todos.filter(todo => todo.status === 'paused');
        const completedTodos = todos.filter(todo => todo.completed);
        
        // 새 할일을 활성 항목들 뒤에 추가
        setTodos([...activeTodos, uiTodo, ...pausedTodos, ...completedTodos]);
        setQuickInputText('');
        
      } catch (error) {
        console.error('Failed to add quick todo:', error);
      }
    }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addQuickTodo();
    }
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo => {
      if (todo.id === id) {
        const updatedTodo = { ...todo, completed: !todo.completed, status: !todo.completed ? 'completed' : 'active' as 'completed' | 'active' };
        
        if (updatedTodo.completed) {
          const celebrations = [
            "🎉 와! 정말 잘했어요!",
            "✨ 멋져요! 또 하나 완료!",
            "🚀 대단해요! 계속 파이팅!",
            "🎊 축하합니다! 한 걸음 더!",
            "⭐ 훌륭해요! 성취감 만점!",
            "🏆 완벽해요! 다음도 화이팅!"
          ];
          const message = celebrations[Math.floor(Math.random() * celebrations.length)];
          setCelebrationMessage(message);
          setTimeout(() => setCelebrationMessage(''), 3000);
        }
        
        return updatedTodo;
      }
      return todo;
    });

    // 완료된 항목을 아래로 이동
    const targetTodo = updatedTodos.find(todo => todo.id === id);
    if (targetTodo && targetTodo.completed) {
      const activeTodos = updatedTodos.filter(todo => todo.id !== id && todo.status === 'active');
      const pausedTodos = updatedTodos.filter(todo => todo.id !== id && todo.status === 'paused');
      const completedTodos = updatedTodos.filter(todo => todo.id !== id && todo.completed);
      
      setTodos([...activeTodos, ...pausedTodos, ...completedTodos, targetTodo]);
    } else {
      // 완료 해제 시 활성 항목들 사이에 추가
      if (targetTodo && !targetTodo.completed) {
        const activeTodos = updatedTodos.filter(todo => todo.id !== id && todo.status === 'active' && !todo.completed);
        const pausedTodos = updatedTodos.filter(todo => todo.status === 'paused');
        const completedTodos = updatedTodos.filter(todo => todo.completed);
        
        setTodos([...activeTodos, targetTodo, ...pausedTodos, ...completedTodos]);
      } else {
        setTodos(updatedTodos);
      }
    }
  };

  const toggleTodoStatus = async (id: string) => {
    const currentTodo = todos.find(todo => todo.id === id);
    if (!currentTodo) return;

    const newStatus: 'active' | 'paused' = currentTodo.status === 'active' ? 'paused' : 'active';

    try {
      // API에 상태 업데이트 요청
      await apiService.updateTodo(id, { status: newStatus });

      const updatedTodos = todos.map(todo => {
        if (todo.id === id) {
          return { ...todo, status: newStatus };
        }
        return todo;
      });
      
      const targetTodo = updatedTodos.find(todo => todo.id === id);
      
      if (targetTodo && targetTodo.status === 'paused') {
        // 보류된 항목을 제일 아래로 이동
        const otherTodos = updatedTodos.filter(todo => todo.id !== id);
        setTodos([...otherTodos, targetTodo]);
      } else if (targetTodo && targetTodo.status === 'active') {
        // 재개된 항목을 활성 항목들 맨 위로 이동
        const activeTodos = updatedTodos.filter(todo => todo.id !== id && todo.status === 'active' && !todo.completed);
        const pausedTodos = updatedTodos.filter(todo => todo.status === 'paused');
        const completedTodos = updatedTodos.filter(todo => todo.completed);
        
        setTodos([targetTodo, ...activeTodos, ...pausedTodos, ...completedTodos]);
      } else {
        setTodos(updatedTodos);
      }
    } catch (error) {
      console.error('Failed to update todo status:', error);
    }
  };

  const updateProgress = async (id: string, progress: number) => {
    try {
      await apiService.updateTodo(id, { progress });
      setTodos(prev => prev.map(todo => {
        if (todo.id === id) {
          const updatedTodo = { ...todo, progress };
          updatedTodo.completed = progress === 100;
          updatedTodo.status = progress === 100 ? 'completed' : 
                               progress === 0 ? 'paused' : 'active';
          return updatedTodo;
        }
        return todo;
      }));
      
      // selectedTodo도 함께 업데이트
      if (selectedTodo?.id === id) {
        setSelectedTodo(prev => prev ? { 
          ...prev, 
          progress,
          completed: progress === 100,
          status: progress === 100 ? 'completed' : 
                  progress === 0 ? 'paused' : 'active'
        } : null);
      }
    } catch (error) {
      console.error('Failed to update todo progress:', error);
    }
  };

  // 마감일 업데이트 함수
  const updateTodoDeadline = async (id: string, deadline: string) => {
    try {
      await apiService.updateTodo(id, { deadline });
      setTodos(prev => prev.map(todo => {
        if (todo.id === id) {
          const updatedTodo = { ...todo, deadline };
          return updatedTodo;
        }
        return todo;
      }));
      
      if (selectedTodo?.id === id) {
        setSelectedTodo(prev => prev ? { ...prev, deadline } : null);
      }
    } catch (error) {
      console.error('Failed to update todo deadline:', error);
    }
  };


  // 메인 태스크의 진행률을 서브태스크 완료 상태에 따라 계산
  const calculateMainTaskProgress = (mainTaskId: string) => {
    const mainTaskSubtasks = subtasks.filter(subtask => subtask.parentMainTaskId === mainTaskId);
    
    if (mainTaskSubtasks.length === 0) {
      return 0; // 서브태스크가 없으면 0%
    }
    
    const completedSubtasks = mainTaskSubtasks.filter(subtask => subtask.completed);
    const progressPercentage = Math.round((completedSubtasks.length / mainTaskSubtasks.length) * 100);
    
    console.log(`📊 메인 태스크 ${mainTaskId} 진행률 계산: ${completedSubtasks.length}/${mainTaskSubtasks.length} = ${progressPercentage}%`);
    
    return progressPercentage;
  };

  // 메인 태스크 진행률 업데이트 (서버와 동기화)
  const updateMainTaskProgress = async (mainTaskId: string, updatedSubtasks?: Subtask[]) => {
    // 최신 서브태스크 배열 사용 (매개변수로 전달되면 사용, 아니면 현재 state 사용)
    const currentSubtasks = updatedSubtasks || subtasks;
    const mainTaskSubtasks = currentSubtasks.filter(subtask => subtask.parentMainTaskId === mainTaskId);
    
    if (mainTaskSubtasks.length === 0) {
      return; // 서브태스크가 없으면 업데이트하지 않음
    }
    
    const completedSubtasks = mainTaskSubtasks.filter(subtask => subtask.completed);
    const newProgress = Math.round((completedSubtasks.length / mainTaskSubtasks.length) * 100);
    
    console.log(`📊 메인 태스크 ${mainTaskId} 진행률 계산: ${completedSubtasks.length}/${mainTaskSubtasks.length} = ${newProgress}%`);
    
    try {
      // 서버에 메인 태스크 진행률 업데이트
      await apiService.updateTodo(mainTaskId, {
        progress: newProgress
      });
      
      // UI의 todos 상태도 업데이트
      setTodos(prev => prev.map(todo => {
        if (todo.id === mainTaskId) {
          return {
            ...todo,
            progress: newProgress,
            completed: newProgress === 100
          };
        }
        return todo;
      }));
      
      console.log(`✅ 메인 태스크 진행률 업데이트 완료: ${newProgress}%`);
      
      // 100% 달성 시 투두비 지니 리워드 트리거
      console.log(`🔍 리워드 체크: newProgress = ${newProgress}, mainTaskId = ${mainTaskId}`);
      if (newProgress === 100) {
        console.log('🎯 100% 달성! 리워드 조건 만족');
        const mainTask = todos.find(todo => todo.id === mainTaskId);
        console.log('🔍 메인 태스크 찾기 결과:', mainTask);
        if (mainTask) {
          const rewardInfo = {
            mainTask,
            completedSubtasks: completedSubtasks.length,
            totalSubtasks: mainTaskSubtasks.length
          };
          console.log('🎁 리워드 데이터 설정:', rewardInfo);
          setRewardData(rewardInfo);
          setShowReward(true);
          console.log('🎉 프로젝트 100% 완료! 투두비 지니 등장! showReward = true');
        } else {
          console.log('❌ 메인 태스크를 찾을 수 없음');
        }
      } else {
        console.log(`📊 아직 100% 미달성: ${newProgress}%`);
      }
    } catch (error) {
      console.error('❌ 메인 태스크 진행률 서버 업데이트 실패:', error);
      // UI상에서는 일단 업데이트
      setTodos(prev => prev.map(todo => {
        if (todo.id === mainTaskId) {
          return {
            ...todo,
            progress: newProgress,
            completed: newProgress === 100
          };
        }
        return todo;
      }));
      
      // 에러가 발생해도 100% 달성 시 리워드 트리거
      if (newProgress === 100) {
        const mainTask = todos.find(todo => todo.id === mainTaskId);
        if (mainTask) {
          setRewardData({
            mainTask,
            completedSubtasks: completedSubtasks.length,
            totalSubtasks: mainTaskSubtasks.length
          });
          setShowReward(true);
          console.log('🎉 프로젝트 100% 완료! 투두비 지니 등장!');
        }
      }
    }
  };

  // Daily subtask 완료 상태 토글 함수 
  const toggleDailyTaskComplete = async (subtaskId: string) => {
    const subtaskToUpdate = subtasks.find(s => s.id === subtaskId);
    if (!subtaskToUpdate) return;

    const newCompleted = !subtaskToUpdate.completed;
    
    try {
      // 서버에 완료 상태 업데이트
      await apiService.updateTodo(subtaskId, {
        progress: newCompleted ? 100 : 0
      });
      
      // 업데이트된 서브태스크 배열 생성
      const updatedSubtasks = subtasks.map(subtask => {
        if (subtask.id === subtaskId) {
          return {
            ...subtask,
            completed: newCompleted,
            completedAt: newCompleted ? new Date() : undefined
          };
        }
        return subtask;
      });
      
      setSubtasks(updatedSubtasks);
      
      console.log(`✅ 서브태스크 완료 상태 업데이트: ${subtaskToUpdate.text} - ${newCompleted ? '완료' : '미완료'}`);
      
      // 메인 태스크 진행률 자동 업데이트 (업데이트된 서브태스크 배열 전달)
      await updateMainTaskProgress(subtaskToUpdate.parentMainTaskId, updatedSubtasks);
    } catch (error) {
      console.error('❌ 서브태스크 완료 상태 서버 업데이트 실패:', error);
      // UI상에서는 일단 토글하고, 나중에 동기화 로직으로 처리
      const updatedSubtasks = subtasks.map(subtask => {
        if (subtask.id === subtaskId) {
          return {
            ...subtask,
            completed: newCompleted,
            completedAt: newCompleted ? new Date() : undefined
          };
        }
        return subtask;
      });
      
      setSubtasks(updatedSubtasks);
      
      // 에러가 발생해도 메인 태스크 진행률은 업데이트 시도
      try {
        await updateMainTaskProgress(subtaskToUpdate.parentMainTaskId, updatedSubtasks);
      } catch (progressError) {
        console.error('❌ 메인 태스크 진행률 업데이트 실패:', progressError);
      }
    }
  };

  // 우측 패널에서 Main Task에 Subtask 추가
  const addSubtaskToMainTask = async (mainTaskId: string, subtaskText: string) => {
    if (!subtaskText.trim()) return;

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      text: subtaskText.trim(),
      completed: false,
      time: '09:00', // 기본 시간 (나중에 AI가 최적화)
      date: selectedDate || new Date().toISOString().split('T')[0], // 선택된 날짜 또는 오늘
      estimatedDuration: 60, // 기본 60분 (나중에 AI가 추정)
      parentMainTaskId: mainTaskId
    };

    try {
      // 서버에 서브태스크 저장
      await apiService.createTodo({
        title: newSubtask.text,
        time: newSubtask.time,
        date: newSubtask.date,
        estimatedDuration: newSubtask.estimatedDuration,
        parentTodoId: mainTaskId,
        progress: 0
      });
      
      const updatedSubtasks = [...subtasks, newSubtask];
      setSubtasks(updatedSubtasks);
      setSubtaskInput('');
      console.log('✅ 서브태스크가 서버에 저장되었습니다:', newSubtask);
      
      // 메인 태스크 진행률 자동 업데이트 (새 서브태스크 추가 시)
      await updateMainTaskProgress(mainTaskId, updatedSubtasks);
    } catch (error) {
      console.error('❌ 서브태스크 서버 저장 실패:', error);
      // UI상에서는 일단 추가하고, 나중에 동기화 로직으로 처리
      const updatedSubtasks = [...subtasks, newSubtask];
      setSubtasks(updatedSubtasks);
      setSubtaskInput('');
      
      // 에러가 발생해도 메인 태스크 진행률은 업데이트 시도
      try {
        await updateMainTaskProgress(mainTaskId, updatedSubtasks);
      } catch (progressError) {
        console.error('❌ 메인 태스크 진행률 업데이트 실패:', progressError);
      }
    }
  };

  // 우측 패널에서 Subtask 제거
  const removeSubtaskFromMainTask = async (subtaskId: string) => {
    const subtaskToRemove = subtasks.find(s => s.id === subtaskId);
    if (!subtaskToRemove) return;
    
    const parentMainTaskId = subtaskToRemove.parentMainTaskId;
    
    try {
      // 서버에서 서브태스크 삭제
      await apiService.deleteTodo(subtaskId);
      const updatedSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
      setSubtasks(updatedSubtasks);
      
      // 왼쪽 패널(todos)에서도 해당 서브태스크 제거
      setTodos(prev => prev.filter(todo => todo.id !== subtaskId));
      
      console.log('✅ 서브태스크가 서버 및 왼쪽 패널에서 삭제되었습니다:', subtaskId);
      
      // 메인 태스크 진행률 자동 업데이트 (서브태스크 삭제 시)
      await updateMainTaskProgress(parentMainTaskId, updatedSubtasks);
    } catch (error) {
      console.error('❌ 서브태스크 서버 삭제 실패:', error);
      // UI상에서는 일단 제거하고, 나중에 동기화 로직으로 처리
      const updatedSubtasks = subtasks.filter(subtask => subtask.id !== subtaskId);
      setSubtasks(updatedSubtasks);
      
      // 에러가 발생해도 메인 태스크 진행률은 업데이트 시도
      try {
        await updateMainTaskProgress(parentMainTaskId, updatedSubtasks);
      } catch (progressError) {
        console.error('❌ 메인 태스크 진행률 업데이트 실패:', progressError);
      }
    }
  };

  // 시간 편집 시작
  const startTimeEdit = (subtaskId: string, currentTime: string) => {
    setEditingTimeId(subtaskId);
    setTempTime(currentTime);
  };

  // 시간 편집 완료
  const finishTimeEdit = async () => {
    if (editingTimeId && tempTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      try {
        // 서버에 시간 업데이트
        await apiService.updateTodo(editingTimeId, {
          time: tempTime
        });
        
        setSubtasks(prev => prev.map(subtask => {
          if (subtask.id === editingTimeId) {
            return { ...subtask, time: tempTime };
          }
          return subtask;
        }));
        
        console.log(`✅ 서브태스크 시간 업데이트: ${tempTime}`);
      } catch (error) {
        console.error('❌ 서브태스크 시간 서버 업데이트 실패:', error);
        // UI상에서는 일단 업데이트하고, 나중에 동기화 로직으로 처리
        setSubtasks(prev => prev.map(subtask => {
          if (subtask.id === editingTimeId) {
            return { ...subtask, time: tempTime };
          }
          return subtask;
        }));
      }
    }
    setEditingTimeId(null);
    setTempTime('');
  };

  // 시간 편집 취소
  const cancelTimeEdit = () => {
    setEditingTimeId(null);
    setTempTime('');
  };

  // 통합 자료 업로드 처리 (파일 + 링크)
  const handleResourceUpload = (files: File[]) => {
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];
      return validTypes.includes(file.type);
    });
    
    if (!selectedTodo) return;
    
    setUploadedFiles(prev => ({
      ...prev,
      [selectedTodo.id]: [...(prev[selectedTodo.id] || []), ...validFiles]
    }));
    console.log('Uploaded files for task', selectedTodo.id, ':', validFiles);
  };

  // 링크 추가 처리
  const handleLinkAdd = () => {
    if (!linkInput.trim() || !selectedTodo) return;
    
    // URL 유효성 검사
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (urlPattern.test(linkInput)) {
      setUploadedLinks(prev => ({
        ...prev,
        [selectedTodo.id]: [...(prev[selectedTodo.id] || []), linkInput.trim()]
      }));
      setLinkInput('');
      console.log('Added link for task', selectedTodo.id, ':', linkInput);
    } else {
      alert('올바른 URL 형식을 입력해주세요.');
    }
  };

  // 붙여넣기 이벤트에서 URL 감지
  const handleResourcePaste = (e: React.ClipboardEvent) => {
    if (!selectedTodo) return;
    
    const pastedText = e.clipboardData.getData('text');
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (urlPattern.test(pastedText)) {
      e.preventDefault();
      setUploadedLinks(prev => ({
        ...prev,
        [selectedTodo.id]: [...(prev[selectedTodo.id] || []), pastedText.trim()]
      }));
      console.log('Pasted link for task', selectedTodo.id, ':', pastedText);
    }
  };

  // 자료 삭제 (파일 또는 링크)
  const handleResourceDelete = (type: 'file' | 'link', index: number) => {
    if (!selectedTodo) return;
    
    if (type === 'file') {
      setUploadedFiles(prev => ({
        ...prev,
        [selectedTodo.id]: (prev[selectedTodo.id] || []).filter((_, i) => i !== index)
      }));
    } else {
      setUploadedLinks(prev => ({
        ...prev,
        [selectedTodo.id]: (prev[selectedTodo.id] || []).filter((_, i) => i !== index)
      }));
    }
  };

  // 통합 드래그 오버 핸들러
  const handleResourceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  // 통합 드래그 리브 핸들러  
  const handleResourceDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  // 통합 드롭 핸들러 (파일 + 텍스트)
  const handleResourceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // 파일이 있으면 파일 처리
    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      handleResourceUpload(files);
    }
    
    // 텍스트 데이터가 있으면 URL인지 확인
    const draggedText = e.dataTransfer.getData('text/plain');
    if (draggedText && selectedTodo) {
      const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (urlPattern.test(draggedText)) {
        setUploadedLinks(prev => ({
          ...prev,
          [selectedTodo.id]: [...(prev[selectedTodo.id] || []), draggedText.trim()]
        }));
        console.log('Dropped link for task', selectedTodo.id, ':', draggedText);
      }
    }
  };

  // 클릭으로 파일 업로드
  const handleClickFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      handleResourceUpload(files);
    };
    input.click();
  };

  // AI 분석 실행
  const handleTodoAnalysis = async () => {
    if (!selectedTodo) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      // AI가 설정되어 있는지 확인
      if (!aiService.isConfigured()) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
      }

      // AI 분석 실행 - 현재 선택된 태스크의 파일들만 사용
      const analysis = await aiService.analyzeTask(
        selectedTodo.title,
        selectedTodo.description,
        selectedTodo.deadline,
        uploadedFiles[selectedTodo.id] || [],
        uploadedLinks[selectedTodo.id] || []
      );

      setAnalysisResult(analysis);

      // 분석 결과를 바탕으로 서브태스크 추가
      if (analysis.suggestedSubtasks.length > 0) {
        const newSubtasks: Subtask[] = analysis.suggestedSubtasks.map(suggestion => ({
          id: suggestion.id,
          text: suggestion.text,
          completed: false,
          time: suggestion.time || '09:00',
          date: suggestion.date || new Date().toISOString().split('T')[0], // AI가 지정한 날짜 사용
          estimatedDuration: suggestion.estimatedDuration,
          parentMainTaskId: selectedTodo.id
        }));

        // AI 생성 서브태스크들을 서버에 저장
        const subtaskSavePromises = newSubtasks.map(async (subtask) => {
          try {
            await apiService.createTodo({
              title: subtask.text,
              time: subtask.time,
              date: subtask.date,
              estimatedDuration: subtask.estimatedDuration,
              parentTodoId: selectedTodo.id,
              progress: 0
            });
            console.log('✅ AI 서브태스크 서버 저장 완료:', subtask.text);
          } catch (error) {
            console.error('❌ AI 서브태스크 서버 저장 실패:', subtask.text, error);
          }
        });

        // 모든 서브태스크 저장 시도
        await Promise.allSettled(subtaskSavePromises);

        setSubtasks(prev => [
          ...prev.filter(st => st.parentMainTaskId !== selectedTodo.id), // 기존 서브태스크 제거
          ...newSubtasks
        ]);

        // 생성된 서브태스크들의 날짜별 분포 로깅
        const dateDistribution: Record<string, number> = {};
        newSubtasks.forEach(subtask => {
          const date = subtask.date || 'unknown';
          dateDistribution[date] = (dateDistribution[date] || 0) + 1;
        });

        console.log(`✅ AI가 ${analysis.suggestedSubtasks.length}개의 서브태스크를 생성했습니다.`);
        console.log(`📅 날짜별 분포:`, dateDistribution);

        // 생성된 서브태스크가 있는 첫 번째 날짜로 자동 이동
        if (newSubtasks.length > 0 && newSubtasks[0].date) {
          setSelectedDate(newSubtasks[0].date);
        }
        
        // 메인 태스크 진행률 초기화 (AI가 서브태스크 생성 시 0%로 시작)
        await updateMainTaskProgress(selectedTodo.id);
      }

    } catch (error) {
      console.error('AI 분석 실패:', error);
      setAnalysisError(error instanceof Error ? error.message : 'AI 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      // 삭제할 todo 찾기
      const todoToDelete = todos.find(todo => todo.id === id);
      if (!todoToDelete) return;

      // 메인태스크인지 서브태스크인지 확인
      const isMainTask = !todoToDelete.parentTodoId;
      
      if (isMainTask) {
        // 메인태스크 삭제 시: 관련된 모든 서브태스크도 함께 삭제
        const relatedSubtasks = subtasks.filter(subtask => subtask.parentMainTaskId === id);
        
        // 서브태스크들을 먼저 삭제
        for (const subtask of relatedSubtasks) {
          await apiService.deleteTodo(subtask.id);
        }
        
        // 메인태스크 삭제
        await apiService.deleteTodo(id);
        
        // 로컬 상태에서 메인태스크와 관련 서브태스크들 제거
        setTodos(prev => prev.filter(todo => todo.id !== id));
        setSubtasks(prev => prev.filter(subtask => subtask.parentMainTaskId !== id));
        
        // todos 배열에서도 관련 서브태스크들 제거 (만약 있다면)
        const relatedSubtaskIds = relatedSubtasks.map(subtask => subtask.id);
        setTodos(prev => prev.filter(todo => !relatedSubtaskIds.includes(todo.id)));
        
        // 업로드된 파일들도 정리
        setUploadedFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[id];
          return newFiles;
        });
        
        setUploadedLinks(prev => {
          const newLinks = { ...prev };
          delete newLinks[id];
          return newLinks;
        });
        
        // 선택된 todo가 삭제된 메인태스크라면 선택 해제
        if (selectedTodo?.id === id) {
          setSelectedTodo(null);
        }
        
        console.log(`메인태스크 ${id}와 관련 서브태스크들이 삭제되었습니다.`);
      } else {
        // 서브태스크 삭제 시: 해당 서브태스크만 삭제
        await apiService.deleteTodo(id);
        setTodos(prev => prev.filter(todo => todo.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 드래그 핸들에서만 드래그 시작 허용
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) {
      e.preventDefault();
      return;
    }
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTodoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTodoDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === targetId) return;
    
    const draggedIndex = todos.findIndex(todo => todo.id === draggedItem);
    const targetIndex = todos.findIndex(todo => todo.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newTodos = [...todos];
    const draggedTodo = newTodos[draggedIndex];
    
    // Remove dragged item
    newTodos.splice(draggedIndex, 1);
    
    // Insert at target position
    newTodos.splice(targetIndex, 0, draggedTodo);
    
    setTodos(newTodos);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // 왼쪽 패널 드래그 앤 드롭 핸들러들
  const handleDailyTaskDragStart = (e: React.DragEvent, taskId: string) => {
    console.log('🚀 Drag started:', taskId);
    setDraggedDailyTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDailyTaskDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    console.log('🔄 Drag over event:', { draggedDailyTask, index });
    
    // 드래그된 아이템의 현재 인덱스를 찾기
    const dailyTasks = getDailyTasks();
    const draggedIndex = dailyTasks.findIndex(task => task.id === draggedDailyTask);
    
    console.log('🔍 Drag over details:', { draggedIndex, index, dailyTasksCount: dailyTasks.length });
    
    // 같은 아이템이면 무시
    if (draggedIndex === index) {
      console.log('❌ Same index, ignoring');
      setDropZoneIndex(null);
      return;
    }
    
    console.log('✅ Setting drop zone index to:', index);
    setDropZoneIndex(index);
  };

  // 리스트 끝에 드롭하기 위한 핸들러
  const handleDailyTaskDragOverEnd = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dailyTasks = getDailyTasks();
    const draggedIndex = dailyTasks.findIndex(task => task.id === draggedDailyTask);
    
    // 맨 마지막이 아닌 경우만 드롭 존 표시
    if (draggedIndex !== dailyTasks.length - 1) {
      setDropZoneIndex(dailyTasks.length);
    }
  };

  const handleDailyTaskDropEnd = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedDailyTask) return;
    
    const dailyTasks = getDailyTasks();
    const draggedIndex = dailyTasks.findIndex(task => task.id === draggedDailyTask);
    
    if (draggedIndex === -1) return;
    
    // 맨 마지막으로 이동
    const reorderedTasks = [...dailyTasks];
    const [draggedTask] = reorderedTasks.splice(draggedIndex, 1);
    reorderedTasks.push(draggedTask);
    
    const newOrder = reorderedTasks.map(task => task.id);
    setDailyTaskOrder(newOrder);
    
    setDraggedDailyTask(null);
    setDropZoneIndex(null);
  };

  const handleDailyTaskDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📍 Drop event:', { draggedDailyTask, targetIndex });
    
    if (!draggedDailyTask) return;
    
    const dailyTasks = getDailyTasks();
    const draggedIndex = dailyTasks.findIndex(task => task.id === draggedDailyTask);
    
    if (draggedIndex === -1) return;
    
    // 같은 위치에 드롭하면 아무것도 하지 않음
    if (draggedIndex === targetIndex) {
      setDraggedDailyTask(null);
      setDropZoneIndex(null);
      return;
    }
    
    // 새로운 순서로 배열 재정렬
    const reorderedTasks = [...dailyTasks];
    const [draggedTask] = reorderedTasks.splice(draggedIndex, 1);
    
    // 타겟 인덱스 조정 (드래그된 아이템이 제거되었으므로)
    const adjustedTargetIndex = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
    reorderedTasks.splice(adjustedTargetIndex, 0, draggedTask);
    
    // 새로운 순서를 상태에 저장
    const newOrder = reorderedTasks.map(task => task.id);
    setDailyTaskOrder(newOrder);
    
    console.log('🔄 Daily tasks reordered:', {
      draggedIndex,
      targetIndex,
      adjustedTargetIndex,
      newOrder: newOrder.map((id, i) => `${i}: ${dailyTasks.find(t => t.id === id)?.title}`)
    });
    
    setDraggedDailyTask(null);
    setDropZoneIndex(null);
  };

  const handleDailyTaskDragEnd = () => {
    setDraggedDailyTask(null);
    setDropZoneIndex(null);
  };

  const handleDailyTaskDragLeave = (e: React.DragEvent) => {
    // 진짜 컨테이너를 떠날 때만 리셋 (자식 요소로 이동하는 것 무시)
    const currentTarget = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (currentTarget.contains(relatedTarget)) {
      return;
    }
    
    console.log('🚪 Drag leave - resetting drop zone');
    setDropZoneIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  };

  // const getAiSuggestion = () => {
  //   const suggestions = [
  //     "이 작업을 더 작은 단계로 나누어보는 게 어떨까요?",
  //     "마감일을 설정해보세요! 목표가 명확해집니다.",
  //     "비슷한 작업들을 그룹화해보는 건 어떨까요?",
  //     "이 작업의 우선순위를 정해보세요!",
  //     "완료 후 자신에게 작은 보상을 준비해보세요!",
  //     "작업을 시작하기 전에 필요한 준비물을 확인해보세요.",
  //     "집중할 수 있는 환경을 먼저 만들어보세요!"
  //   ];
  //   return suggestions[Math.floor(Math.random() * suggestions.length)];
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    // if (value.length > 3) {
    //   setAiSuggestion(getAiSuggestion());
    // } else {
    //   setAiSuggestion('');
    // }
  };

  return (
    <div className="App">
      <div className="three-column-layout">
        {/* 왼쪽 컬럼: 주간 달력 패널 */}
        <div className="left-column">
          <div className="calendar-header">
            <div className="calendar-title-section">
              <h3>주간 일정표</h3>
              <div className="calendar-connection">
                {googleCalendarConnected ? (
                  <button 
                    onClick={handleGoogleCalendarSignOut}
                    className="calendar-btn connected"
                    title="구글 캘린더 연결됨"
                  >
                    📅 연결됨
                  </button>
                ) : (
                  <button 
                    onClick={handleGoogleCalendarSignIn}
                    className="calendar-btn disconnected"
                    disabled={isLoadingCalendar}
                    title="구글 캘린더 연결"
                  >
                    {isLoadingCalendar ? '연결중...' : '📅 연결'}
                  </button>
                )}
              </div>
            </div>
            <div className="week-navigation">
              <span className="current-week">{getCurrentWeekString()}</span>
              <button 
                className="calendar-expand-btn"
                onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                title={isCalendarExpanded ? "달력 접기" : "달력 펼치기"}
              >
                {isCalendarExpanded ? '▲' : '▼'}
              </button>
            </div>
          </div>
          <div className="calendar-content">
            <div className="week-calendar">
              <div className="week-days">
                <div className="day-header">월</div>
                <div className="day-header">화</div>
                <div className="day-header">수</div>
                <div className="day-header">목</div>
                <div className="day-header">금</div>
                <div className="day-header">토</div>
                <div className="day-header">일</div>
              </div>
              <div className={isCalendarExpanded ? "expanded-calendar-dates" : "week-dates"}>
                {getCurrentWeekDates().map((dateInfo, index) => (
                  <div key={dateInfo.dateStr} className={`day-cell ${dateInfo.isToday ? 'today' : ''} ${selectedDate === dateInfo.dateStr ? 'selected' : ''} ${isCalendarExpanded && dateInfo.isNewWeek ? 'week-start' : ''}`} onClick={() => setSelectedDate(dateInfo.dateStr)}>
                    <div className="day-number">
                      {dateInfo.dayNum}
                      {isCalendarExpanded && dateInfo.dayNum === 1 && <span className="month-indicator">{dateInfo.month}월</span>}
                    </div>
                    <div className="day-tasks">
                      {hasSubtasksOnDate(dateInfo.dateStr) ? (
                        Array.from({length: Math.min(getSubtaskCountOnDate(dateInfo.dateStr), 3)}, (_, taskIndex) => (
                          <div key={taskIndex} className={`task-dot ${taskIndex < getCompletedSubtaskCountOnDate(dateInfo.dateStr) ? 'completed' : 'active'}`}></div>
                        ))
                      ) : (
                        <div className="task-dot completed"></div>
                      )}
                    </div>
                  {getDailySummary(dateInfo.dateStr) && (
                    <div 
                      className="daily-summary-badge"
                      onMouseEnter={(e) => handleBadgeHover(e, getDailySummary(dateInfo.dateStr)!)}
                      onMouseLeave={handleBadgeLeave}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderDayBadge(getDailySummary(dateInfo.dateStr)!.badge)}
                    </div>
                  )}
                  </div>
                ))}
              </div>
            </div>
            <div className="quick-add-section">
              <h4>
                {selectedDate ? (
                  <>➕ {new Date(selectedDate).toLocaleDateString('ko-KR', { 
                    month: 'long', 
                    day: 'numeric', 
                    weekday: 'short' 
                  })} 할일 추가</>
                ) : (
                  <>➕ 할일 추가</>
                )}
              </h4>
              
              <div className="quick-input-container">
                <input
                  type="text"
                  value={quickInputText}
                  onChange={(e) => setQuickInputText(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  placeholder={selectedDate ? "할 일을 입력하세요..." : "먼저 날짜를 선택하세요"}
                  className="quick-todo-input"
                  disabled={!selectedDate}
                />
                <button 
                  onClick={addQuickTodo} 
                  className="quick-add-button"
                  disabled={!selectedDate || !quickInputText.trim()}
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="daily-tasks-section">
              {selectedDate ? (
                <>
                  <h4>📝 {new Date(selectedDate).toLocaleDateString('ko-KR', { 
                    month: 'long', 
                    day: 'numeric',
                    weekday: 'short'
                  })} 할일</h4>
                  <div className="daily-tasks-list scrollable">
                    {getDailyTasks().map((task: any, index: number) => {
                      const dailyTasks = getDailyTasks();
                      const draggedIndex = dailyTasks.findIndex(t => t.id === draggedDailyTask);
                      const isDraggedItem = draggedDailyTask === task.id;
                      
                      // 드래그 중일 때만 움직임 계산
                      let transformStyle = '';
                      if (draggedDailyTask && !isDraggedItem && dropZoneIndex !== null && draggedIndex !== -1) {
                        // 드롭 존이 드래그된 아이템보다 위에 있는 경우 (위로 이동)
                        if (dropZoneIndex < draggedIndex) {
                          // 드롭 존과 드래그된 아이템 사이에 있는 아이템들을 아래로 이동
                          if (index >= dropZoneIndex && index < draggedIndex) {
                            transformStyle = 'translateY(68px)';
                          }
                        } 
                        // 드롭 존이 드래그된 아이템보다 아래에 있는 경우 (아래로 이동)
                        else if (dropZoneIndex > draggedIndex) {
                          // 드래그된 아이템과 드롭 존 사이에 있는 아이템들을 위로 이동
                          if (index > draggedIndex && index < dropZoneIndex) {
                            transformStyle = 'translateY(-68px)';
                          }
                        }
                      }

                      return (
                        <div 
                          key={`task-container-${task.id}`}
                          onDragOver={(e) => handleDailyTaskDragOver(e, index)}
                          onDrop={(e) => handleDailyTaskDrop(e, index)}
                        >
                          {/* 드롭 존 표시 */}
                          {dropZoneIndex === index && !isDraggedItem && (
                            <div className="drop-zone-indicator">
                              <div className="drop-zone-line"></div>
                            </div>
                          )}
                          
                          <div 
                            className={`daily-task-item ${getSubtaskDeadlineUrgency(task) === 'urgent' ? 'urgent-deadline' : ''} ${isDraggedItem ? 'dragging' : ''} ${draggedDailyTask && !isDraggedItem ? 'other-dragging' : ''} ${task.completed ? 'completed' : ''}`}
                            onClick={(e) => {
                              if (!draggedDailyTask) {
                                handleSubtaskClick(task);
                              }
                            }}
                            style={{ 
                              cursor: draggedDailyTask ? 'grabbing' : 'grab',
                              transform: transformStyle,
                              transition: isDraggedItem ? 'none' : 'transform 0.3s ease'
                            }}
                          >
                            <div 
                              className="drag-handle-daily"
                              draggable
                              onDragStart={(e) => handleDailyTaskDragStart(e, task.id)}
                              onDragEnd={handleDailyTaskDragEnd}
                            >
                              <span className="drag-icon-daily">☰</span>
                            </div>
                            <div className="task-time-container">
                              {editingTimeId === task.id ? (
                                <input
                                  type="text"
                                  value={tempTime}
                                  onChange={(e) => setTempTime(e.target.value)}
                                  onBlur={finishTimeEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      finishTimeEdit();
                                    } else if (e.key === 'Escape') {
                                      cancelTimeEdit();
                                    }
                                  }}
                                  className="time-edit-input"
                                  placeholder="HH:MM"
                                  autoFocus
                                />
                              ) : (
                                <div 
                                  className="task-time editable-time"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startTimeEdit(task.id, task.time);
                                  }}
                                  title="클릭하여 시간 수정"
                                >
                                  {task.time}
                                </div>
                              )}
                            </div>
                            <div className="task-content">
                              <div className="task-title">
                                <span className="task-title-text">{task.title}</span>
                                {(() => {
                                  const urgency = getSubtaskDeadlineUrgency(task);
                                  if (urgency === 'urgent') {
                                    return (
                                      <span 
                                        className="deadline-badge urgent inline" 
                                        data-tooltip="마감"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        ⚠️
                                      </span>
                                    );
                                  } else if (urgency === 'warning') {
                                    return (
                                      <span 
                                        className="deadline-badge warning inline" 
                                        data-tooltip="내일 마감"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        ⏰
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleDailyTaskComplete(task.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="daily-task-checkbox"
                            />
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* 맨 마지막에 드롭 존 */}
                    <div 
                      className="drop-zone-end"
                      onDragOver={handleDailyTaskDragOverEnd}
                      onDrop={handleDailyTaskDropEnd}
                      onDragLeave={handleDailyTaskDragLeave}
                      style={{ 
                        minHeight: draggedDailyTask ? '60px' : '20px',
                        transition: 'min-height 0.3s ease'
                      }}
                    >
                      {dropZoneIndex === getDailyTasks().length && (
                        <div className="drop-zone-indicator">
                          <div className="drop-zone-line"></div>
                        </div>
                      )}
                    </div>
                    <div className="add-daily-task">
                      <button className="add-task-btn">+ 시간별 할일 추가</button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h4>📅 오늘의 시간표</h4>
                  <div className="no-date-selected">
                    <div className="calendar-prompt">
                      📋 날짜를 선택하면<br />
                      그 날의 세부 일정을 확인할 수 있어요
                    </div>
                    <div className="today-preview">
                      <h5>오늘 예정된 일</h5>
                      <div className="preview-tasks">
                        <div className="preview-task">• React 컴포넌트 개발</div>
                        <div className="preview-task">• 프로젝트 문서 작성</div>
                        <div className="preview-task">• 코드 리뷰</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
          </div>
        </div>

        {/* 중앙 컬럼: 할일 목록 */}
        <div className="center-column">
          <div className="todo-container"> 
            <div className="header-section">
              <div className="header-content">
                <div className="header-text">
                  <h1>Todooby</h1>
                  <p className="todooby-greeting"> 두비두밥~ 나는 투두비야! 너의 일을 차근차근 도와줄게! </p>
                </div>
                <div className="todooby-character">
                  <img src="/todooby.png" alt="Todooby" className="todooby-image" />
                </div>
              </div>
            </div>
        
            <div className="input-section">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="할 일을 입력하세요..."
                className="todo-input"
              />
              <button onClick={addTodo} className="add-button">
                추가
              </button>
            </div>


            {celebrationMessage && (
              <div className="celebration">
                <div className="celebration-icon">
                  <img src="/todooby.png" alt="Todooby" className="celebration-icon-image" />
                </div>
                <div className="celebration-text">{celebrationMessage}</div>
              </div>
            )}

            <div className="todo-list">
              {todos.length === 0 ? (
                <p className="empty-message">할 일이 없습니다.</p>
              ) : (
                todos.filter(todo => !todo.parentTodoId).map(todo => (
                  <div 
                    key={todo.id} 
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${todo.status} ${draggedItem === todo.id ? 'dragging' : ''} ${selectedTodo?.id === todo.id ? 'selected' : ''}`}
                    onDragOver={handleTodoDragOver}
                    onDrop={(e) => handleTodoDrop(e, todo.id)}
                    onClick={() => setSelectedTodo(todo)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div 
                      className="drag-handle"
                      draggable={!todo.completed}
                      onDragStart={(e) => handleDragStart(e, todo.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="drag-icon">☰</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="todo-checkbox"
                    />
                    <div className="todo-content">
                      <div className="todo-text-row">
                        <span className="todo-text">{todo.text}</span>
                        <div className="todo-deadline-section">
                          {todo.deadline ? (
                            <div className="deadline-input-wrapper">
                              <input
                                type="date"
                                value={todo.deadline || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateTodoDeadline(todo.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="hidden-date-input"
                                id={`todo-deadline-${todo.id}`}
                              />
                              <label 
                                htmlFor={`todo-deadline-${todo.id}`}
                                className={`deadline-badge clickable ${
                                  (() => {
                                    const today = new Date();
                                    const deadline = new Date(todo.deadline);
                                    const diffTime = deadline.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    if (diffDays <= 0) return 'urgent';
                                    if (diffDays <= 1) return 'warning';
                                    return 'normal';
                                  })()
                                }`}
                                onClick={(e) => e.stopPropagation()}
                                title="클릭하여 마감기한 수정"
                              >
                                📅 {new Date(todo.deadline).toLocaleDateString('ko-KR', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </label>
                            </div>
                          ) : (
                            <div className="deadline-input-wrapper">
                              <input
                                type="date"
                                value=""
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateTodoDeadline(todo.id, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="hidden-date-input"
                                id={`todo-deadline-set-${todo.id}`}
                              />
                              <label 
                                htmlFor={`todo-deadline-set-${todo.id}`}
                                className="deadline-set-btn-small"
                                onClick={(e) => e.stopPropagation()}
                                title="마감기한 설정"
                              >
                                📅+
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="todo-progress-container">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={todo.progress}
                          onChange={(e) => updateProgress(todo.id, parseInt(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="progress-slider-unified"
                          style={{'--progress': `${todo.progress}%`} as React.CSSProperties}
                          disabled={todo.completed}
                        />
                        <span className="progress-text">{todo.progress}%</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTodo(todo.id);
                      }}
                      className="delete-x-button"
                      title="삭제"
                    >
                      ✕
                    </button>
                    <div className="todo-actions">
                      <div className="toggle-container">
                        <label className="toggle-switch" title={todo.status === 'active' ? '보류하기' : '재개하기'}>
                          <input
                            type="checkbox"
                            checked={todo.status === 'paused'}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleTodoStatus(todo.id);
                            }}
                            disabled={todo.completed}
                          />
                          <span className="toggle-slider"></span>
                          <span className="toggle-label">
                            {todo.status === 'active' ? '진행' : '보류'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="progress-section">
              <div className="progress-header">
                <h3>진행 상황</h3>
                <button 
                  onClick={() => setShowProgress(!showProgress)}
                  className="toggle-progress"
                >
                  {showProgress ? '상세 숨기기' : '상세 보기'}
                </button>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar"
                    style={{
                      width: (() => {
                        const activeTodos = todos.filter(todo => todo.status !== 'paused');
                        return activeTodos.length > 0 
                          ? `${(activeTodos.reduce((sum, todo) => sum + todo.progress, 0) / activeTodos.length)}%` 
                          : '0%';
                      })()
                    }}
                  >
                    <div className="progress-glow"></div>
                  </div>
                  <div className="progress-percentage">
                    {(() => {
                      const activeTodos = todos.filter(todo => todo.status !== 'paused');
                      return activeTodos.length > 0 
                        ? Math.round(activeTodos.reduce((sum, todo) => sum + todo.progress, 0) / activeTodos.length)
                        : 0;
                    })()}%
                  </div>
                </div>
                
                {showProgress && (
                  <>
                    <div className="progress-stats">
                      <div className="stat-item total">
                        <span className="stat-emoji">📝</span>
                        <span className="stat-label">전체</span>
                        <span className="stat-value">{todos.length}</span>
                      </div>
                      <div className="stat-item completed">
                        <span className="stat-emoji">✅</span>
                        <span className="stat-label">완료</span>
                        <span className="stat-value">{todos.filter(t => t.completed).length}</span>
                      </div>
                      <div className="stat-item remaining">
                        <span className="stat-emoji">⏳</span>
                        <span className="stat-label">진행중</span>
                        <span className="stat-value">{todos.filter(t => t.status === 'active' && !t.completed).length}</span>
                      </div>
                      <div className="stat-item paused">
                        <span className="stat-emoji">⏸️</span>
                        <span className="stat-label">보류중</span>
                        <span className="stat-value">{todos.filter(t => t.status === 'paused').length}</span>
                      </div>
                    </div>
                    
                    {todos.length > 0 && todos.filter(t => t.completed).length === todos.length && (
                      <div className="all-completed-celebration">
                        <div className="celebration-fireworks">🎉</div>
                        <div className="celebration-message">
                          <strong>축하합니다! 모든 할 일을 완료했어요! 🎊</strong>
                          <p>정말 대단해요! 오늘도 성취감 가득한 하루네요! ⭐</p>
                        </div>
                        <div className="celebration-fireworks">🎉</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 컬럼: 상세 분석 */}
        <div className="right-column">
          {selectedTodo ? (
            <>
              <div className="detail-header">
                <div className="detail-header-content">
                  <h3>할일 상세 분석</h3>
                  <button 
                    onClick={() => setSelectedTodo(null)}
                    className="close-detail-button"
                    title="닫기"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="detail-content">
                <div className="selected-todo-info">
                  <div className="main-task-header">
                    <div className="main-task-title">
                      <span className="task-icon">📋</span>
                      <h3 className="main-task-name">{selectedTodo.text}</h3>
                    </div>
                    <div className="main-task-progress">
                      <div className="progress-circle">
                        <div className="progress-text">{selectedTodo.progress}%</div>
                      </div>
                      {subtasks.filter(s => s.parentMainTaskId === selectedTodo.id).length > 0 && (
                        <div className="progress-info">
                          <small>
                            {subtasks.filter(s => s.parentMainTaskId === selectedTodo.id && s.completed).length}/{subtasks.filter(s => s.parentMainTaskId === selectedTodo.id).length}
                          </small>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="todo-details-section">
                    <div className="detail-item">
                      <label>📎 자료 업로드</label>
                      
                      {/* 통합 업로드 존 - 파일 + 링크 */}
                      <div className="resource-upload-container">
                        <div className="link-input-section">
                          <input
                            type="text"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onPaste={handleResourcePaste}
                            placeholder="링크 URL을 입력하거나 붙여넣기 (https://example.com)"
                            className="link-input"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleLinkAdd();
                              }
                            }}
                          />
                          <button onClick={handleLinkAdd} className="link-add-btn">
                            링크 추가
                          </button>
                        </div>

                        <div 
                          className={`resource-upload-zone ${isDragOver ? 'drag-over' : ''} ${((uploadedFiles[selectedTodo.id]?.length || 0) > 0 || (uploadedLinks[selectedTodo.id]?.length || 0) > 0) ? 'has-files' : ''}`}
                          onDragOver={handleResourceDragOver}
                          onDragLeave={handleResourceDragLeave}
                          onDrop={handleResourceDrop}
                          onClick={handleClickFileUpload}
                        >
                          {((uploadedFiles[selectedTodo.id]?.length || 0) === 0 && (uploadedLinks[selectedTodo.id]?.length || 0) === 0) ? (
                            // 업로드된 자료가 없을 때 - 기본 메시지
                            <>
                              <div className="upload-icon">📎</div>
                              <p className="upload-text">
                                <strong>파일을 드래그하거나 링크를 붙여넣기</strong>
                              </p>
                              <p className="upload-hint">
                                파일: PDF, DOC, TXT, 이미지 | 링크: URL 드래그 또는 위에 입력
                              </p>
                            </>
                          ) : (
                            // 업로드된 자료가 있을 때 - 자료 리스트 표시
                            <div className="uploaded-resources-inline">
                              <div className="resources-header">
                                <span className="upload-icon-small">📚</span>
                                <span className="resources-title">업로드된 자료 ({(uploadedFiles[selectedTodo.id]?.length || 0) + (uploadedLinks[selectedTodo.id]?.length || 0)}개)</span>
                              </div>
                              
                              <div className="resources-list-inline">
                                {/* 파일 리스트 */}
                                {(uploadedFiles[selectedTodo.id] || []).map((file, index) => (
                                  <div key={`file-${index}`} className="resource-item-inline">
                                    <span className="resource-icon">📄</span>
                                    <div className="resource-info">
                                      <span className="resource-name">{file.name}</span>
                                      <span className="resource-meta">{Math.round(file.size / 1024)}KB</span>
                                    </div>
                                    <button 
                                      className="remove-resource-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResourceDelete('file', index);
                                      }}
                                      title="파일 삭제"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                
                                {/* 링크 리스트 */}
                                {(uploadedLinks[selectedTodo.id] || []).map((link, index) => (
                                  <div key={`link-${index}`} className="resource-item-inline">
                                    <span className="resource-icon">🔗</span>
                                    <div className="resource-info">
                                      <span className="resource-name">{link}</span>
                                      <span className="resource-meta">링크</span>
                                    </div>
                                    <button 
                                      className="remove-resource-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResourceDelete('link', index);
                                      }}
                                      title="링크 삭제"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                              </div>
                              
                              <p className="add-more-hint">
                                <span style={{opacity: 0.7}}>+ 더 추가하려면 여기에 드래그하거나 위에 링크 입력</span>
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* 투두비 분석 버튼 - 드롭존 아래로 이동 */}
                        <button 
                          className="todooby-analyze-btn-bottom"
                          onClick={handleTodoAnalysis}
                          disabled={isAnalyzing || !selectedTodo}
                        >
                          <img src="/analytics-panda.png" alt="분석 팬더" className="panda-icon" />
                          {isAnalyzing ? '분석 중...' : '투두비 분석'}
                        </button>



                        {/* AI 분석 결과/오류 표시 */}
                        {analysisError && (
                          <div className="analysis-error">
                            <p>❌ {analysisError}</p>
                          </div>
                        )}

                        {analysisResult && (
                          <div className="analysis-result">
                            <div className="analysis-summary">
                              <p>🎯 복잡도: <strong>{analysisResult.complexity === 'simple' ? '간단' : analysisResult.complexity === 'moderate' ? '보통' : '복잡'}</strong></p>
                              <p>⏱️ 예상 소요시간: <strong>{Math.round(analysisResult.estimatedTotalTime / 60)}시간 {analysisResult.estimatedTotalTime % 60}분</strong></p>
                              <p>🔥 우선순위: <strong>{analysisResult.priority === 'high' ? '높음' : analysisResult.priority === 'medium' ? '보통' : '낮음'}</strong></p>
                              <p>📝 서브태스크: <strong>{analysisResult.suggestedSubtasks.length}개 생성됨</strong></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="detail-item subtask-section">
                      <label>📝 세부 진행 단계</label>
                      <div className="progress-steps">
                        <div className="subtask-input-container">
                          <input
                            type="text"
                            value={subtaskInput}
                            onChange={(e) => setSubtaskInput(e.target.value)}
                            placeholder="새 서브태스크 추가 (AI 제안을 수정하거나 직접 입력)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addSubtaskToMainTask(selectedTodo.id, subtaskInput);
                              }
                            }}
                            className="subtask-input"
                          />
                          <button 
                            onClick={() => addSubtaskToMainTask(selectedTodo.id, subtaskInput)}
                            className="subtask-add-btn"
                          >
                            추가
                          </button>
                        </div>
                        
                        <div className="subtasks-for-main-task">
                          {subtasks
                            .filter(subtask => subtask.parentMainTaskId === selectedTodo.id)
                            .map((subtask) => (
                              <div key={subtask.id} className="subtask-preview">
                                <div className="subtask-info">
                                  <span className="subtask-text">{subtask.text}</span>
                                  <span className="subtask-time">⏰ {subtask.time} ({subtask.estimatedDuration}분)</span>
                                </div>
                                <button
                                  onClick={() => removeSubtaskFromMainTask(subtask.id)}
                                  className="subtask-remove-btn"
                                  title="제거"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          }
                          
                          {subtasks.filter(subtask => subtask.parentMainTaskId === selectedTodo.id).length === 0 && (
                            <div className="no-subtasks">
                              AI가 이 Main Task를 분석하여 서브태스크를 제안합니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="detail-empty">
              <div className="detail-header">
                <h3>할일 상세 분석</h3>
                <p>할일을 선택하여 자세한 정보를 확인하세요</p>
              </div>
              <div className="detail-content">
                <div className="detail-placeholder">
                  할일을 클릭하면 상세 정보가 나타납니다
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 서브태스크 정보 팝업 */}
      {subtaskPopup.show && subtaskPopup.mainTask && (
        <div className="subtask-popup-overlay" onClick={closeSubtaskPopup}>
          <div className="subtask-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>📋 메인 태스크 진행 상황</h3>
              <button onClick={closeSubtaskPopup} className="popup-close-btn">✕</button>
            </div>
            
            <div className="popup-content">
              <div className="main-task-info">
                <h4 className="main-task-title">{subtaskPopup.mainTask.text}</h4>
                
                <div className="task-status-overview">
                  <div className="status-item">
                    <span className="status-label">전체 진행률</span>
                    <div className="main-progress-container">
                      <div className="main-progress-bar">
                        <div 
                          className="main-progress-fill" 
                          style={{width: `${calculateMainTaskProgress(subtaskPopup.mainTask.id)}%`}}
                        ></div>
                      </div>
                      <span className="progress-percentage">{calculateMainTaskProgress(subtaskPopup.mainTask.id)}%</span>
                    </div>
                  </div>
                  
                  <div className="status-item">
                    <span className="status-label">상태</span>
                    <span className={`status-badge-popup ${subtaskPopup.mainTask.status}`}>
                      {subtaskPopup.mainTask.status === 'active' ? '진행중' : 
                       subtaskPopup.mainTask.status === 'paused' ? '보류중' : '완료'}
                    </span>
                  </div>
                  
                  {subtaskPopup.mainTask.deadline && (
                    <div className="status-item">
                      <span className="status-label">마감일</span>
                      <span className={`deadline-badge-popup ${getDeadlineUrgency(subtaskPopup.mainTask.deadline)}`}>
                        {new Date(subtaskPopup.mainTask.deadline).toLocaleDateString('ko-KR', { 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="current-subtask-info">
                <h5>📝 현재 서브태스크</h5>
                <div className="subtask-details">
                  <div className="subtask-title">{subtaskPopup.subtask.title}</div>
                  <div className="subtask-time">⏰ {subtaskPopup.subtask.time}</div>
                  <div className="subtask-progress-info">
                    <span>진행률: {subtaskPopup.subtask.progress}%</span>
                    <div className="subtask-progress-bar">
                      <div 
                        className="subtask-progress-fill" 
                        style={{width: `${subtaskPopup.subtask.progress}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 투두비 지니 리워드 팝업 */}
      {showReward && rewardData.mainTask && (
        <div className="reward-popup-overlay" onClick={closeRewardPopup}>
          <div className="reward-popup" onClick={(e) => e.stopPropagation()}>
            <div className="reward-header">
              <div className="dancing-todobi">
                <span className="todobi-emoji">🧞‍♂️</span>
                <div className="sparkles">✨</div>
              </div>
              <h2 className="reward-title">축하합니다! 🎉</h2>
              <button onClick={closeRewardPopup} className="reward-close-btn">✕</button>
            </div>
            
            <div className="reward-content">
              <div className="achievement-info">
                <h3>"{rewardData.mainTask.text}" 프로젝트를 완료하셨군요!</h3>
                <div className="completion-stats">
                  <span>✅ 완료한 서브태스크: {rewardData.completedSubtasks}개</span>
                  <span>🎯 총 서브태스크: {rewardData.totalSubtasks}개</span>
                  <span>📈 달성률: 100%</span>
                </div>
              </div>
              
              <div className="genie-message">
                <div className="message-bubble">
                  <p>🧞‍♂️ 지니 투두비가 소원 하나를 들어드릴게요!</p>
                  <p>어떤 보상을 받고 싶으신가요?</p>
                </div>
              </div>
              
              <div className="reward-options">
                {rewardOptions.map(option => (
                  <label key={option.id} className="reward-option">
                    <input
                      type="radio"
                      name="reward"
                      value={option.id}
                      checked={selectedReward === option.id}
                      onChange={(e) => setSelectedReward(e.target.value)}
                    />
                    <span className="option-content">
                      <span className="option-emoji">{option.emoji}</span>
                      <span className="option-text">{option.text}</span>
                    </span>
                  </label>
                ))}
              </div>
              
              <div className="reward-actions">
                <button 
                  onClick={confirmReward} 
                  className="confirm-reward-btn"
                  disabled={!selectedReward}
                >
                  소원을 빌어주세요! 🌟
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* 일일 요약 툴팁 */}
      {summaryTooltip.show && summaryTooltip.content && (
        <div 
          className="summary-tooltip"
          style={{
            position: 'fixed',
            left: `${summaryTooltip.position.x}px`,
            top: `${summaryTooltip.position.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000
          }}
        >
          <div className="tooltip-content">
            <div className="tooltip-header">
              <span className="tooltip-emoji">{renderDayBadge(summaryTooltip.content.badge)}</span>
              <span className="tooltip-title">일일 요약</span>
            </div>
            <div className="tooltip-message">
              {getPerformanceMessage(summaryTooltip.content)}
            </div>
            <div className="tooltip-mood">
              기분: {summaryTooltip.content.mood === 'excellent' ? '최고!' : 
                     summaryTooltip.content.mood === 'good' ? '좋음' :
                     summaryTooltip.content.mood === 'average' ? '보통' :
                     summaryTooltip.content.mood === 'challenging' ? '도전적' : '어려움'}
            </div>
          </div>
          <div className="tooltip-arrow"></div>
        </div>
      )}
    </div>
  );
}

export default App;