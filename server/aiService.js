const OpenAI = require('openai');

// OpenAI 클라이언트 초기화 (서버에서 안전하게)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 서버 환경변수에서 읽기
});

// 이미지를 OpenAI Vision API로 분석합니다
async function analyzeImage(imageBase64, index) {
  try {
    const completion = await openai.chat.completions.create({  
      model: "gpt-4o", // 명시적 구형 모델 사용
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
      max_completion_tokens: 1300
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
  webContents = [],   // [{ text: string, images: string[], url: string }]
  userRequirements = '', // 사용자 요구사항
  difficultyLevel = 'normal' // 'easy' | 'normal' | 'hard'
) {
  const startTime = Date.now();
  console.log('🚀 analyzeTask 함수 호출됨!');
  console.log('📝 파라미터:', { 
    mainTaskTitle, 
    description, 
    deadline, 
    fileContents: fileContents.length, 
    webContents: webContents.length,
    userRequirements: userRequirements ? `"${userRequirements}"` : '없음',
    difficultyLevel 
  });
  
  try {
    console.log('⏱️ AI 분석 시작:', mainTaskTitle, `[${new Date().toISOString()}]`);

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

    // 사용자 요구사항 추가
    if (userRequirements) {
      prompt += `\n\n사용자 요구사항: ${userRequirements}`;
    }

    // 난이도 설정에 따른 상세 안내
    const difficultyGuide = {
      easy: `널널하게 모드:
- 서브태스크를 큰 덩어리 단위로 묶어서 대충 확인할 수 있도록 해주세요
- 너무 세세하게 나누지 말고 큰 그림으로 접근하세요
- 충분한 휴식일과 버퍼를 두고 여유로운 일정으로 배치하세요
- 압박감 없이 천천히 진행할 수 있는 계획을 세워주세요`,
      normal: `보통 모드:
- 적절한 크기의 서브태스크로 나누어 균형잡힌 일정을 만들어주세요
- 무리하지 않는 선에서 효율적인 계획을 세워주세요
- 마감일까지 적당한 페이스로 진행할 수 있도록 배분하세요`,
      hard: `빡세게 모드:
- 서브태스크를 더 작고 세밀한 단위로 세분화해서 정확하게 관리할 수 있도록 해주세요
- 각 단계를 구체적이고 상세하게 나누어 놓치는 부분이 없도록 하세요
- 도전적이고 집중적인 작업 계획을 세워주세요
- 효율성을 최우선으로 한 타이트하고 체계적인 스케줄로 구성하세요`
    };

    prompt += `\n\n난이도 설정: ${difficultyGuide[difficultyLevel]}`;

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
**사용자 요구사항과 난이도 설정을 반드시 고려하여 계획을 수립하세요**

요구사항:
- 서브태스크는 3-7개 정도로 적절하게 나누기
- 각 서브태스크는 실행 가능하고 구체적이어야 함
- **난이도 설정에 맞게 적절한 작업량으로 나누기**
- **중요: 마감기한이 있다면 오늘부터 마감일까지 서브태스크를 균등하게 분산배치**
  * 총 작업 기간을 계산하고 서브태스크를 여러 날에 걸쳐 적절히 분배
  * **마감일 당일까지 포함하여** 전체 기간에 걸쳐 고르게 분산
  * 예: 5일 남았다면 1일차, 2일차, 3일차, 4일차, 5일차(마감일)에 골고루 배분
- **사용자 요구사항을 반드시 준수하고 난이도 설정에 맞는 작업량과 속도로 계획하기**
- 우선순위와 순서를 논리적으로 배치하되, 날짜 분산을 최우선 고려
- 한국어로 응답하기

`;

    const promptTime = Date.now();
    console.log(`🔧 프롬프트 생성 완료: ${promptTime - startTime}ms`);
    console.log('📤 OpenAI 요청 시작...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // 명시적 구형 모델 사용
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
      max_completion_tokens: 2000
    });

    const responseTime = Date.now();
    console.log(`✅ OpenAI 응답 받음: ${responseTime - promptTime}ms`);
    console.log(`📊 총 소요 시간: ${responseTime - startTime}ms`);

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
    const errorTime = Date.now();
    console.error(`❌ AI 과제 분석 실패: ${errorTime - startTime}ms 후`);
    console.error('🔍 오류 상세:', {
      message: error.message,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // 스택 트레이스 일부
    });
    
    if (error.response) {
      console.error('📡 OpenAI API 응답 오류:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    if (error.code) {
      console.error('🌐 네트워크 오류 코드:', error.code);
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

// AI 서비스 워밍업 함수
async function warmupAI() {
  const startTime = Date.now();
  console.log('🔥 AI 서비스 워밍업 시작...');
  
  try {
    // 간단한 워밍업 요청
    const warmupResult = await analyzeTask(
      '워밍업 테스트', 
      '이것은 서버 시작 시 AI 연결을 테스트하는 워밍업 요청입니다.', 
      '', 
      [], 
      [], 
      '빠르게 응답해주세요', 
      'normal'
    );
    
    const endTime = Date.now();
    console.log(`✅ AI 워밍업 완료: ${endTime - startTime}ms`);
    console.log('🎯 워밍업 결과:', {
      complexity: warmupResult.complexity,
      subtasks: warmupResult.suggestedSubtasks.length
    });
    
    return true;
  } catch (error) {
    const endTime = Date.now();
    console.log(`⚠️ AI 워밍업 실패: ${endTime - startTime}ms`);
    console.log('🔍 워밍업 실패 이유:', error.message);
    return false;
  }
}

module.exports = {
  analyzeTask,
  analyzeImage,
  warmupAI
};