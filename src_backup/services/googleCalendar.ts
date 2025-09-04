// Google Calendar API 연동 서비스 (더미 구현)
// 실제 구현은 나중에 환경 변수 설정 후 진행

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
}

class GoogleCalendarService {
  private isInitialized = false;
  private isSignedIn = false;

  // Google API 초기화 (더미 구현)
  async initializeGapi() {
    if (this.isInitialized) return;
    console.log('Google Calendar API initialized (dummy implementation)');
    this.isInitialized = true;
    this.isSignedIn = false;
  }

  // 사용자 로그인 (더미 구현)
  async signIn(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeGapi();
    }
    console.log('Google Calendar sign in (dummy implementation)');
    this.isSignedIn = true;
    return true;
  }

  // 사용자 로그아웃 (더미 구현)
  async signOut(): Promise<void> {
    console.log('Google Calendar sign out (dummy implementation)');
    this.isSignedIn = false;
  }

  // 로그인 상태 확인 (더미 구현)
  isUserSignedIn(): boolean {
    return this.isSignedIn;
  }

  // 특정 날짜 범위의 이벤트 가져오기 (더미 구현)
  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.isUserSignedIn()) {
      throw new Error('User is not signed in');
    }
    console.log('Getting calendar events (dummy implementation)', startDate, endDate);
    return [];
  }

  // 주간 이벤트 가져오기 (더미 구현)
  async getWeeklyEvents(weekStart: Date): Promise<CalendarEvent[]> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return this.getEvents(weekStart, weekEnd);
  }

  // 일일 이벤트 가져오기 (더미 구현)
  async getDailyEvents(date: Date): Promise<CalendarEvent[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    return this.getEvents(dayStart, dayEnd);
  }

  // 이벤트를 할일 형식으로 변환 (더미 구현)
  convertEventToTask(event: CalendarEvent) {
    const startTime = event.start.dateTime 
      ? new Date(event.start.dateTime).toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        })
      : '종일';

    return {
      id: `calendar-${event.id}`,
      time: startTime,
      title: event.summary || '제목 없음',
      description: event.description || '',
      location: event.location || '',
      isFromCalendar: true,
      progress: 0,
      deadline: event.start.date || event.start.dateTime?.split('T')[0] || '',
      parentTodoId: null
    };
  }
}

// 싱글톤 인스턴스
export const googleCalendarService = new GoogleCalendarService();
export type { CalendarEvent };