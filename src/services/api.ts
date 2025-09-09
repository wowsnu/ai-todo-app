import { TodoData } from '../types/todo';

const API_BASE_URL = (() => {
  // 현재 호스트 기반 자동 감지
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log(`🌐 Detected hostname: ${hostname}`);
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 Using local development API');
      return 'http://localhost:3001/api';
    }
    // Vercel 또는 기타 배포 환경 (Nginx HTTPS 프록시)
    console.log('☁️ Using production API via HTTPS');
    return 'https://43.203.188.214/api';
  }
  // SSR 환경 fallback
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
})();

export interface DailySummary {
  date: string;
  completed_tasks: number;
  total_tasks: number;
  completion_rate: number;
  badge: string;
  mood: string;
  ai_comment?: string;
}

class ApiService {
  // Get auth token from localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Create authorization headers
  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Todo API methods
  async getTodos(): Promise<TodoData[]> {
    const response = await fetch(`${API_BASE_URL}/todos`, {
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch todos');
    const data = await response.json();
    return data as TodoData[];
  }

  async createTodo(todoData: {
    title: string;
    time?: string;
    description?: string;
    location?: string;
    isFromCalendar?: boolean;
    progress?: number;
    deadline?: string;
    parentTodoId?: string | null;
    date?: string;
    estimatedDuration?: number;
  }): Promise<TodoData> {
    const todoWithDefaults: TodoData = {
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      description: '',
      location: '',
      isFromCalendar: false,
      progress: 0,
      deadline: '',
      parentTodoId: null,
      status: 'active',
      ...todoData,
      id: Date.now().toString()
    };
    
    const response = await fetch(`${API_BASE_URL}/todos`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(todoWithDefaults),
    });
    
    if (!response.ok) throw new Error('Failed to create todo');
    return todoWithDefaults; // TodoData 타입 그대로 리턴
  }

  async updateTodo(id: string, updates: Partial<TodoData>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) throw new Error('Failed to update todo');
  }

  async deleteTodo(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) throw new Error('Failed to delete todo');
    return response.json();
  }

  // Daily Summary API methods
  async getDailySummaries(): Promise<DailySummary[]> {
    const response = await fetch(`${API_BASE_URL}/daily-summaries`);
    if (!response.ok) throw new Error('Failed to fetch daily summaries');
    return response.json();
  }

  async getDailySummary(date: string): Promise<DailySummary | null> {
    const response = await fetch(`${API_BASE_URL}/daily-summaries/${date}`);
    if (!response.ok) throw new Error('Failed to fetch daily summary');
    return response.json();
  }

  async saveDailySummary(summary: DailySummary): Promise<{ date: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/daily-summaries`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(summary),
    });
    
    if (!response.ok) throw new Error('Failed to save daily summary');
    return response.json();
  }

  async calculateDailySummary(date: string): Promise<DailySummary> {
    const response = await fetch(`${API_BASE_URL}/calculate-daily-summary/${date}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) throw new Error('Failed to calculate daily summary');
    return response.json();
  }

  // Helper method to format date for API
  formatDateForAPI(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Google authentication
  async authenticateWithGoogle(token: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token
      }),
    });
  }

}

export const apiService = new ApiService();