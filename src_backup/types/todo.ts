// API 기본 Todo 인터페이스
export interface TodoData {
  id: string;
  time: string;
  title: string;
  description: string;
  location: string;
  isFromCalendar: boolean;
  progress: number; // 0-100
  deadline: string;
  parentTodoId: string | null;
  status: 'active' | 'paused' | 'completed'; // 상태를 API에도 저장
  date?: string; // AI 서브태스크를 위한 날짜 필드
  estimatedDuration?: number; // AI 서브태스크를 위한 예상 소요시간 필드
}

// UI와 호환되는 확장된 Todo 인터페이스
export interface Todo extends TodoData {
  // 계산된 속성들
  completed: boolean;
  status: 'active' | 'paused' | 'completed';
  text: string; // title의 별칭
}

// API 데이터를 UI Todo로 변환하는 유틸리티 함수
export function createTodo(apiData: TodoData): Todo {
  return {
    ...apiData,
    get completed() { return this.progress === 100; },
    get status() { 
      if (this.progress === 100) return 'completed';
      if (this.progress === 0) return 'paused';
      return 'active';
    },
    get text() { return this.title; }
  };
}

// Todo를 API 데이터로 변환하는 유틸리티 함수
export function toApiData(todo: Todo): TodoData {
  return {
    id: todo.id,
    time: todo.time,
    title: todo.title,
    description: todo.description,
    location: todo.location,
    isFromCalendar: todo.isFromCalendar,
    progress: todo.progress,
    deadline: todo.deadline,
    parentTodoId: todo.parentTodoId,
    status: todo.status
  };
}