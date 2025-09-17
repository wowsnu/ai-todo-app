// OpenAI API 호출은 이제 백엔드에서 안전하게 처리됩니다
const API_BASE_URL = (() => {
  // 현재 호스트 기반 자동 감지
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    console.log(`🤖 AI Service - Detected hostname: ${hostname}`);

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 AI Service - Using local development API');
      return 'http://localhost:3001/api';
    }
    // Vercel 또는 기타 배포 환경
    console.log('☁️ AI Service - Using production API via HTTPS');
    return 'https://todooby.duckdns.org/api';
  }
  // SSR 환경 fallback
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
})();

export interface SubtaskSuggestion {
  id: string;
  text: string;
  estimatedDuration: number; // 분 단위
  priority: 'high' | 'medium' | 'low';
  order: number;
  time?: string; // 추천 시간 (예: "09:00")
  date?: string; // 추천 날짜 (예: "2025-08-28")
}

export interface TaskAnalysis {
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTotalTime: number; // 분 단위
  suggestedSubtasks: SubtaskSuggestion[];
  priority: 'high' | 'medium' | 'low';
}

class AIService {
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

  /**
   * Main Task를 분석하여 서브태스크를 생성합니다 (백엔드 API 호출)
   */
  async analyzeTask(
    mainTaskTitle: string,
    description?: string,
    deadline?: string,
    uploadedFiles?: File[],
    uploadedLinks?: string[],
    userRequirements?: string,
    difficultyLevel?: 'easy' | 'normal' | 'hard',
    userSchedule?: {
      timezone?: string;
      workingHours?: { start: string; end: string };
      busyByDate?: Record<string, { start: string; end: string }[]>;
      avoidWeekends?: boolean;
      lunchBreak?: { start: string; end: string } | null;
      maxDailyMinutes?: number | null;
    }
  ): Promise<TaskAnalysis> {
    try {
      console.log('AI 분석 시작 (백엔드 호출):', mainTaskTitle);

      // 파일 내용 추출 (최대 3개 파일만 처리)
      const fileContents = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        const filesToProcess = uploadedFiles.slice(0, 3); // 최대 3개만
        for (const file of filesToProcess) {
          // 파일 크기 체크 (10MB 이상은 건너뛰기)
          if (file.size > 10 * 1024 * 1024) {
            console.warn(`파일이 너무 큽니다: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
            continue;
          }
          
          const fileContent = await this.extractFileContent(file);
          fileContents.push({
            fileName: file.name,
            text: fileContent.text,
            images: fileContent.images
          });
        }
      }

      // 웹 내용 추출
      const webContents = [];
      if (uploadedLinks && uploadedLinks.length > 0) {
        for (const link of uploadedLinks) {
          const webContent = await this.scrapeWebContent(link);
          webContents.push({
            url: link,
            text: webContent.text,
            images: webContent.images
          });
        }
      }

      // 백엔드 API 호출
      const response = await fetch(`${API_BASE_URL}/analyze-task`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          mainTaskTitle,
          description,
          deadline,
          fileContents,
          webContents,
          userRequirements: userRequirements || '',
          difficultyLevel: difficultyLevel || 'normal',
          userSchedule: userSchedule || null
        }),
      });

      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // JSON parsing failed, use status text
        }
        
        if (response.status === 413) {
          throw new Error('업로드한 파일이 너무 큽니다. 파일 크기를 줄여서 다시 시도해주세요.');
        }
        
        throw new Error(`Backend API error: ${errorMessage}`);
      }

      const analysis: TaskAnalysis = await response.json();
      console.log('백엔드에서 AI 분석 완료:', analysis.complexity);
      
      return analysis;

    } catch (error) {
      console.error('AI 과제 분석 실패:', error);
      
      // 폴백: 기본 서브태스크 제안
      return this.getFallbackAnalysis(mainTaskTitle);
    }
  }

  /**
   * AI 분석 실패 시 사용할 기본 분석 결과
   */
  private getFallbackAnalysis(mainTaskTitle: string): TaskAnalysis {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    return {
      complexity: 'moderate',
      estimatedTotalTime: 120,
      priority: 'medium',
      suggestedSubtasks: [
        {
          id: `fallback-subtask-${Date.now()}-1`,
          text: `${mainTaskTitle} - 계획 수립`,
          estimatedDuration: 30,
          priority: 'high',
          order: 1,
          time: '09:00',
          date: todayString
        },
        {
          id: `fallback-subtask-${Date.now()}-2`,
          text: `${mainTaskTitle} - 자료 수집 및 조사`,
          estimatedDuration: 45,
          priority: 'high',
          order: 2,
          time: '10:00',
          date: todayString
        },
        {
          id: `fallback-subtask-${Date.now()}-3`,
          text: `${mainTaskTitle} - 실행 및 작업`,
          estimatedDuration: 60,
          priority: 'medium',
          order: 3,
          time: '14:00',
          date: todayString
        },
        {
          id: `fallback-subtask-${Date.now()}-4`,
          text: `${mainTaskTitle} - 검토 및 완료`,
          estimatedDuration: 15,
          priority: 'medium',
          order: 4,
          time: '16:00',
          date: todayString
        }
      ]
    };
  }

  /**
   * PDF 파일의 텍스트를 추출합니다 (현재 브라우저 제한으로 인해 기본 메시지만 반환)
   */
  private async extractPdfContent(file: File): Promise<string> {
    try {
      // 브라우저에서 PDF 파싱은 복잡하므로 일단 기본 메시지 반환
      // 향후 서버사이드에서 처리하거나 다른 라이브러리 사용 가능
      return `[PDF 파일: ${file.name} - PDF 내용 분석 기능은 현재 개발 중입니다. 파일명과 메타 정보를 기반으로 분석합니다.]`;
    } catch (error) {
      console.error('PDF 파싱 오류:', error);
      return `[PDF 파일 처리 오류: ${file.name}]`;
    }
  }

  /**
   * 이미지를 OpenAI Vision API로 분석합니다
   */
  private async analyzeImage(imageBase64: string, index: number): Promise<string> {
    // 이미지 분석은 백엔드의 analyzeTask API에서 처리됩니다
    return `[이미지 ${index + 1}: 백엔드에서 분석됨]`;
  }

  /**
   * Word 파일(.docx)의 텍스트와 이미지를 추출합니다
   */
  private async extractWordContent(file: File): Promise<{text: string, images: string[]}> {
    try {
      const mammoth = await import('mammoth');
      const buffer = await file.arrayBuffer();
      
      // 텍스트 추출
      const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
      const text = textResult.value || '[Word 문서에서 텍스트를 추출할 수 없습니다]';
      
      // 이미지 추출은 현재 제한적으로 지원
      const images: string[] = [];
      console.log(`Word 문서 처리 완료: ${file.name} (텍스트 추출됨, 이미지는 향후 지원 예정)`);
      
      return { text, images };
    } catch (error) {
      console.error('Word 파싱 오류:', error);
      return { 
        text: `[Word 파일 처리 오류: ${file.name}]`, 
        images: [] 
      };
    }
  }

  /**
   * PDF에서 이미지를 추출합니다 (향후 구현)
   */
  private async extractPdfImages(_file: File): Promise<string[]> {
    // PDF에서 이미지 추출은 복잡하므로 일단 빈 배열 반환
    // 향후 PDF.js의 getOperatorList를 사용하여 구현 가능
    return [];
  }

  /**
   * 이미지 파일을 base64로 변환하고 필요시 압축합니다
   */
  private async extractImageContent(file: File): Promise<{text: string, images: string[]}> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          try {
            // 이미지 크기 확인 및 압축
            const compressedImage = await this.compressImage(result, file.name);
            resolve({ 
              text: `[이미지 파일: ${file.name} - AI가 이미지 내용을 분석합니다]`,
              images: [compressedImage]
            });
          } catch (error) {
            console.error('이미지 압축 실패:', error);
            // 압축 실패 시 원본 사용
            resolve({ 
              text: `[이미지 파일: ${file.name} - AI가 이미지 내용을 분석합니다]`,
              images: [result]
            });
          }
        } else {
          resolve({ 
            text: `[이미지 파일 읽기 실패: ${file.name}]`,
            images: []
          });
        }
      };
      
      reader.onerror = () => {
        resolve({ 
          text: `[이미지 파일 읽기 오류: ${file.name}]`,
          images: []
        });
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * 이미지를 압축하여 payload 크기를 줄입니다
   */
  private async compressImage(base64Data: string, fileName: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(base64Data); // 압축 실패시 원본 반환
          return;
        }
        
        // 최대 크기 설정 (더 작게 리사이즈)
        const maxWidth = 800;
        const maxHeight = 800;
        
        let { width, height } = img;
        
        // 비율 유지하면서 리사이즈
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG로 압축 (품질 0.8로 적당하게 압축)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log(`이미지 압축: ${fileName} (${Math.round(base64Data.length / 1024)}KB → ${Math.round(compressedBase64.length / 1024)}KB)`);
        
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        console.error('이미지 로드 실패:', fileName);
        resolve(base64Data); // 실패시 원본 반환
      };
      
      img.src = base64Data;
    });
  }

  /**
   * 파일 내용을 읽어서 텍스트와 이미지를 추출합니다
   */
  private async extractFileContent(file: File): Promise<{text: string, images: string[]}> {
    // 이미지 파일 처리
    if (file.type.startsWith('image/') || 
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
      return await this.extractImageContent(file);
    }
    
    // PDF 파일 처리
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const text = await this.extractPdfContent(file);
      const images = await this.extractPdfImages(file);
      return { text, images };
    }
    
    // Word 파일 처리
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.name.toLowerCase().endsWith('.docx')) {
      return await this.extractWordContent(file);
    }
    
    // 기존 텍스트 파일 처리
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve({ text: result, images: [] });
        } else {
          resolve({ text: `[파일 내용을 읽을 수 없습니다: ${file.name}]`, images: [] });
        }
      };
      
      reader.onerror = () => {
        resolve({ text: `[파일 읽기 오류: ${file.name}]`, images: [] });
      };
      
      // 파일 타입에 따라 읽기 방식 결정
      if (file.type.startsWith('text/') || 
          file.name.endsWith('.txt') || 
          file.name.endsWith('.md') || 
          file.name.endsWith('.json') ||
          file.name.endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8');
      } else {
        resolve({ text: `[지원되지 않는 파일 형식: ${file.name} (${file.type})]`, images: [] });
      }
    });
  }

  /**
   * 웹페이지에서 이미지 URL들을 추출합니다
   */
  private extractImageUrlsFromHtml(htmlContent: string, baseUrl: string): string[] {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    const images = tempDiv.querySelectorAll('img');
    const imageUrls: string[] = [];
    
    images.forEach(img => {
      let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
      if (src) {
        // 상대 경로를 절대 경로로 변환
        if (src.startsWith('//')) {
          src = 'https:' + src;
        } else if (src.startsWith('/')) {
          const baseUrlObj = new URL(baseUrl);
          src = baseUrlObj.origin + src;
        } else if (!src.startsWith('http')) {
          const baseUrlObj = new URL(baseUrl);
          src = new URL(src, baseUrlObj.href).href;
        }
        
        // 너무 작은 이미지나 아이콘 제외 (width, height 체크)
        const width = img.getAttribute('width');
        const height = img.getAttribute('height');
        if (width && height && (parseInt(width) < 100 || parseInt(height) < 100)) {
          return;
        }
        
        imageUrls.push(src);
      }
    });
    
    // 중복 제거 및 최대 5개로 제한 (성능상의 이유)
    const uniqueUrls = Array.from(new Set(imageUrls));
    return uniqueUrls.slice(0, 5);
  }

  /**
   * 웹 이미지 URL을 base64로 변환합니다 (현재는 제한적으로 지원)
   */
  private async convertWebImageToBase64(imageUrl: string): Promise<string | null> {
    try {
      // 웹 이미지 변환은 CORS 등의 문제로 인해 제한적
      // 향후 서버 사이드에서 처리하거나 다른 방법 모색 필요
      console.log('웹 이미지 변환 시도:', imageUrl);
      return null; // 현재는 null 반환
    } catch (error) {
      console.error('이미지 변환 오류:', error);
      return null;
    }
  }

  /**
   * 웹 URL의 내용을 스크래핑합니다 (텍스트 + 이미지)
   */
  private async scrapeWebContent(url: string): Promise<{text: string, images: string[]}> {
    try {
      // CORS 문제로 인해 클라이언트에서 직접 스크래핑은 제한적
      // 대신 공개 API나 프록시 서비스를 사용
      const corsProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(corsProxyUrl);
      if (!response.ok) {
        return { 
          text: `[웹페이지 접근 실패: ${url}]`,
          images: []
        };
      }
      
      const data = await response.json();
      const htmlContent = data.contents;
      
      // 텍스트 추출
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      // 스크립트와 스타일 태그 제거
      const scripts = tempDiv.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // 너무 긴 내용은 앞부분만 사용 (토큰 제한 고려)
      const maxLength = 2000;
      const text = textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '...[내용이 길어서 일부만 표시됨]'
        : textContent;

      // 이미지 추출
      const imageUrls = this.extractImageUrlsFromHtml(htmlContent, url);
      const images: string[] = [];
      
      // 각 이미지 URL을 base64로 변환 (병렬 처리로 성능 향상)
      const imagePromises = imageUrls.map(imageUrl => this.convertWebImageToBase64(imageUrl));
      const imageResults = await Promise.allSettled(imagePromises);
      
      imageResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          images.push(result.value);
        } else {
          console.log(`이미지 ${index + 1} 변환 실패:`, imageUrls[index]);
        }
      });
      
      return { text, images };
        
    } catch (error) {
      console.error('웹 스크래핑 오류:', error);
      return { 
        text: `[웹페이지 내용을 가져올 수 없습니다: ${url}]`,
        images: []
      };
    }
  }

  /**
   * 파일 내용을 분석하여 과제 힌트를 제공합니다 (현재는 analyzeTask로 통합됨)
   */
  async analyzeUploadedContent(files: File[], links: string[]): Promise<string[]> {
    // 이제 모든 분석이 analyzeTask API에서 통합적으로 처리됩니다
    if (files.length === 0 && links.length === 0) {
      return ['업로드된 자료가 없습니다.'];
    }
    
    return [
      '파일 및 링크 분석은 투두비 분석 기능에서 통합적으로 처리됩니다.',
      '메인 태스크와 함께 파일/링크를 업로드하여 AI 분석을 받아보세요.'
    ];
  }

  /**
   * API 키가 설정되어 있는지 확인 (현재는 백엔드에서 처리)
   */
  isConfigured(): boolean {
    // API 키는 이제 백엔드에서 관리되므로 항상 true 반환
    return true;
  }

}

export const aiService = new AIService();
