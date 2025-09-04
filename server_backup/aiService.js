const OpenAI = require('openai');

// OpenAI 클라이언트 초기화 (서버에서 안전하게)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 서버 환경변수에서 읽기
});

// 이미지를 OpenAI Vision API로 분석합니다
async function analyzeImage(imageBase64, index) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5", // 안정적인 모델 사용
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 이미지를 분석해서 프로젝트나 과제와 관련된 정보를 한국어로 간단히 설명해주세요. 차트, 다이어그램, 계획표, 스크린샷 등이 있다면 그 내용을 구체적으로 설명해주세요."
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_completion_tokens: 300
    });

    return completion.choices[0].message.content || `[이미지 ${index + 1} 분석 실패]`;
  } catch (error) {
    console.error(`이미지 ${index + 1} 분석 오류:`, error);
    return `[이미지 ${index + 1}: 분석할 수 없음]`;
  }
}

// Main Task를 분석하여 서브태스크를 생성합니다
async function analyzeTask(
  mainTaskTitle,
  description = '',
  deadline = '',
  fileContents = [], // [{ text: string, images: string[], fileName: string }]
  webContents = []   // [{ text: string, images: string[], url: string }]
) {
  console.log('🚀 analyzeTask 함수 호출됨!');
  console.log('📝 파라미터:', { mainTaskTitle, description, deadline, fileContents: fileContents.length, webContents: webContents.length });
  try {
    console.log('서버에서 AI 분석 시작:', mainTaskTitle);

    // 현재 날짜 계산 (한국 시간 기준)
    const today = new Date();
    today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
    const todayString = today.toISOString().split('T')[0];
    
    // 프롬프트 구성
    let prompt = `당신은 경험이 풍부한 프로젝트 매니저입니다. 다음 과제를 현실적으로 분석하여 세부 실행 단계로 나누어 주세요:

과제 제목: ${mainTaskTitle}`;

    if (description) {
      prompt += `\n설명: ${description}`;
    }

    if (deadline) {
      prompt += `\n마감기한: ${deadline}`;
      
      // 남은 일수 계산
      const deadlineDate = new Date(deadline);
      const diffTime = deadlineDate.getTime() - today.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (remainingDays > 0) {
        prompt += ` (오늘로부터 ${remainingDays}일 남음)`;
      } else if (remainingDays === 0) {
        prompt += ` (오늘이 마감일)`;
      } else {
        prompt += ` (마감일이 ${Math.abs(remainingDays)}일 지남)`;
      }
    }

    // 파일 내용 분석
    for (const fileContent of fileContents) {
      prompt += `\n\n=== 파일: ${fileContent.fileName} ===\n${fileContent.text}`;
      
      // 이미지가 있다면 이미지 분석도 포함
      if (fileContent.images && fileContent.images.length > 0) {
        prompt += `\n[이 파일에 ${fileContent.images.length}개의 이미지가 포함됨]`;
        for (let i = 0; i < fileContent.images.length; i++) {
          const imageAnalysis = await analyzeImage(fileContent.images[i], i);
          prompt += `\n이미지 ${i + 1} 분석: ${imageAnalysis}`;
        }
      }
    }

    // 웹 내용 분석
    for (const webContent of webContents) {
      prompt += `\n\n=== 웹사이트: ${webContent.url} ===\n${webContent.text}`;
      
      // 웹 이미지가 있다면 이미지 분석도 포함
      if (webContent.images && webContent.images.length > 0) {
        prompt += `\n[이 웹페이지에 ${webContent.images.length}개의 이미지가 포함됨]`;
        for (let i = 0; i < webContent.images.length; i++) {
          const imageAnalysis = await analyzeImage(webContent.images[i], i);
          prompt += `\n웹이미지 ${i + 1} 분석: ${imageAnalysis}`;
        }
      }
    }

    prompt += `
오늘 날짜: ${todayString}

**중요: 오직 JSON만 응답하고, 추가 설명이나 주석은 절대 포함하지 마세요. 다음 형식으로만 응답:**
{
  "complexity": "simple|moderate|complex",
  "estimatedTotalTime": 180,
  "priority": "high|medium|low",
  "suggestedSubtasks": [
    {
      "id": "subtask-1",
      "text": "구체적인 작업 내용",
      "estimatedDuration": 30,
      "priority": "high",
      "order": 1,
      "time": "09:00",
      "date": "2025-08-28"
    }
  ]
}

**중요: 과제를 잘 파악하여 효율적으로 서브태스크를 만들어주세요**
**첨부된 파일과 웹사이트 내용을 반드시 분석하여 구체적인 계획에 반영하세요**

요구사항:
- 서브태스크는 3-7개 정도로 적절하게 나누기
- 각 서브태스크는 실행 가능하고 구체적이어야 함
- **시간 추정은 매우 현실적으로 하기**: 
  * 학습이 필요한 경우 학습 시간 포함
  * 조사/리서치 시간 충분히 고려
  * 시행착오, 디버깅, 수정 시간 포함
  * 검토 및 완성도 향상 시간 포함
  * 예상치 못한 문제 해결 시간 20% 추가
- **복잡한 프로젝트(공모전, 논문, 개발 등)는 최소 수십 시간 이상으로 추정**
- **중요: 마감기한이 있다면 오늘부터 마감일까지 서브태스크를 균등하게 분산배치**
  * 총 작업 기간을 계산하고 서브태스크를 여러 날에 걸쳐 적절히 분배
  * **마감일 당일까지 포함하여** 전체 기간에 걸쳐 고르게 분산
  * 각 서브태스크의 소요시간을 고려하여 하루에 과도한 업무량이 몰리지 않도록 조절
  * 예: 5일 남았다면 1일차, 2일차, 3일차, 4일차, 5일차(마감일)에 골고루 배분
- 우선순위와 순서를 논리적으로 배치하되, 날짜 분산을 최우선 고려
- 한국어로 응답하기

**예시**: "데이터 벤처 공모전" 같은 경우 최소 40-80시간 이상 소요됩니다.`;

    console.log('OpenAI 요청 시작...');
    const completion = await openai.chat.completions.create({
      model: "gpt-5", // 안정적인 모델 사용
      messages: [
        {
          role: "system",
          content: "당신은 프로젝트를 효율적으로 관리하는 전문가입니다. 과제를 적절한 서브태스크로 나누고, 마감기한 내에 효율적으로 처리할 수 있도록 현실적이고 실행 가능한 가이드라인을 제공합니다. 첨부된 파일(텍스트, 직접 업로드한 이미지, PDF, Word 등)과 웹사이트 내용을 종합적으로 분석하여 구체적이고 실용적인 계획을 수립해주세요. 업로드된 이미지의 차트, 다이어그램, 계획표, 스크린샷, 요구사항 등의 시각적 정보를 매우 적극적으로 활용해주세요."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_completion_tokens: 1500
    });

    console.log('전체 OpenAI 응답:', JSON.stringify(completion, null, 2));
    console.log('choices 배열:', completion.choices);
    console.log('첫 번째 choice:', completion.choices?.[0]);
    console.log('message 객체:', completion.choices?.[0]?.message);
    console.log('content:', completion.choices?.[0]?.message?.content);
    
    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // JSON 파싱 (개선된 오류 처리)
    let analysis;
    try {
      // ```json 코드 블록이 있으면 제거하고 설명 부분도 제거
      let cleanResponse = response;
      
      // ```json으로 시작하는 코드 블록에서 JSON만 추출
      if (response.includes('```json')) {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[1].trim();
        } else {
          // 백업 방법: ```json 이후 첫 번째 ```까지
          const startIndex = response.indexOf('```json') + 7;
          const endIndex = response.indexOf('```', startIndex);
          if (endIndex !== -1) {
            cleanResponse = response.substring(startIndex, endIndex).trim();
          }
        }
      } 
      // 일반 ``` 코드 블록 처리
      else if (response.includes('```')) {
        const jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[1].trim();
        }
      }
      
      // 추가 정리: 설명 섹션들 제거
      const cleanupPatterns = [
        /### .*/g,  // ### 시작하는 모든 내용
        /\*\*.*?\*\*/g,  // **설명** 형태
        /설명:.*/g,  // 설명: 이후 내용
        /각 서브태스크는.*/g  // 설명 문구들
      ];
      
      cleanupPatterns.forEach(pattern => {
        cleanResponse = cleanResponse.replace(pattern, '');
      });
      
      // 마지막 } 이후의 모든 내용 제거
      const lastBraceIndex = cleanResponse.lastIndexOf('}');
      if (lastBraceIndex !== -1) {
        cleanResponse = cleanResponse.substring(0, lastBraceIndex + 1);
      }
      
      cleanResponse = cleanResponse.trim();
      
      analysis = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      console.error('AI 응답 내용:', response);
      
      // JSON이 아닌 응답인 경우 폴백 사용
      throw new Error('AI가 올바른 JSON 형식으로 응답하지 않았습니다.');
    }
    
    // ID 보정 (중복 방지)
    analysis.suggestedSubtasks = analysis.suggestedSubtasks.map((subtask, index) => ({
      ...subtask,
      id: `ai-subtask-${Date.now()}-${index}`
    }));

    return analysis;

  } catch (error) {
    console.error('AI 과제 분석 실패:', error);
    console.error('오류 상세:', error.message);
    console.error('오류 타입:', error.constructor.name);
    if (error.response) {
      console.error('OpenAI API 응답 오류:', error.response.status, error.response.data);
    }
    
    // 폴백: 기본 서브태스크 제안
    console.log('🚨 AI 분석 실패로 폴백 분석 사용 중...');
    const fallbackResult = getFallbackAnalysis(mainTaskTitle);
    console.log('✅ 폴백 분석 완료:', fallbackResult.complexity);
    return fallbackResult;
  }
}

// AI 분석 실패 시 사용할 기본 분석 결과
function getFallbackAnalysis(mainTaskTitle) {
  console.log(`🔄 getFallbackAnalysis 호출됨 - 제목: ${mainTaskTitle}`);
  const today = new Date();
  today.setHours(today.getHours() + 9); // UTC+9 (한국 시간)
  const todayString = today.toISOString().split('T')[0];
  console.log(`📅 폴백 날짜 설정: ${todayString}`);
  
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

module.exports = {
  analyzeTask,
  analyzeImage
};