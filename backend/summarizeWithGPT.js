require('dotenv').config();
const axios = require('axios');

/**
 * [DEPRECATED] 슬라이드(혹은 텍스트) 내용을 GPT로 요약 (3~5문장)
 * @param {string} text - 요약할 텍스트
 * @returns {Promise<string>} - 요약 결과
 */
async function summarizeWithGPT(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    const messages = [
        { role: "system", content: "당신은 슬라이드 요약을 잘하는 AI입니다." },
        { role: "user", content: `다음 내용을 3~5문장으로 요약해줘:\n${text}` }
    ];

    try {
        const response = await axios.post(
            endpoint,
            {
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 300,
                temperature: 0.5
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (err) {
        console.error('GPT 요약 오류:', err.response?.data || err.message);
        throw err;
    }
}

/**
 * 슬라이드별 구조화 요약 (제목, 개념, 키워드, 중요문장, 전체요약)
 * @param {string} text - 슬라이드 OCR 결과
 * @param {string} imageUrl - 슬라이드 이미지 URL
 * @returns {Promise<object>} - { slide_title, concept_explanation, main_keywords, important_sentences, summary, image_description }
 */
async function summarizeSlideWithGPT(text, imageUrl = null) {
    const apiKey = process.env.OPENAI_API_KEY;
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    // 프롬프트에 [6] 이미지 설명 추가
    const prompt = `아래 슬라이드 텍스트와 이미지를 분석해서 반드시 아래 형식으로 답변해줘.

[1] 슬라이드 제목(소주제): (간결하게)
[2] 개념 설명: (학습자가 처음 접해도 이해할 수 있도록, 예시와 맥락까지 포함해서 아주 자세하고 풍부하게 설명)
[3] 주요 키워드: (쉼표로 구분)
[4] 중요한 문장: (2~5개, 줄바꿈 구분, 핵심 개념/정의/원리/예시 등)
[5] 슬라이드 전체 요약: (최소 10문장 이상, 최대한 자세하고 구체적으로, 배경지식·원리·활용·예시·관련 개념까지 포함해서 설명)
[6] 이미지 설명: (해당 슬라이드에 시각 정보(도표나 그래프 등의 시각적인 정보만)가 있으면, 텍스트로만 상세하게 설명하고, 없으면 "없음")

[슬라이드 텍스트]
${text}`;

    const userContent = [{ type: 'text', text: prompt }];
    if (imageUrl) {
        console.log('[Vision] imageUrl:', imageUrl);
        userContent.push({
            type: 'image_url',
            image_url: { url: imageUrl }
        });
    }

    const messages = [
        { role: "system", content: "당신은 강의 슬라이드를 학습자 관점에서 요약·정리해주는 AI입니다." },
        { role: "user", content: userContent }
    ];

    const modelName = process.env.OPENAI_VISION_MODEL || "gpt-4o";
    const body = {
        model: modelName,
        messages,
        max_tokens: 800,
        temperature: 0.3
    };

    try {
        const resp = await axios.post(endpoint, body, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            }
        });

        // 응답 전체 콘솔 출력
        console.log('[Vision] OpenAI 응답:', JSON.stringify(resp.data, null, 2));

        const content = resp.data.choices[0].message.content.trim();

        // [1]~[6] 파싱 (대괄호 포함 정규식)
        const slide_title = (content.match(/^[\[]1\][\s\S]*?(?=^[\[]2\])/m) || [])[0]?.replace(/^\[1\]\s*:? ?/, '').trim() || '';
        const concept_explanation = (content.match(/^[\[]2\][\s\S]*?(?=^[\[]3\])/m) || [])[0]?.replace(/^\[2\]\s*:? ?/, '').trim() || '';
        const main_keywords = (content.match(/^[\[]3\][\s\S]*?(?=^[\[]4\])/m) || [])[0]?.replace(/^\[3\]\s*:? ?/, '').trim() || '';
        let important_sentences = '';
        const impMatch = content.match(/^[\[]4\][\s\S]*?(?=^[\[]5\])/m);
        if (impMatch) {
            important_sentences = impMatch[0]
                .replace(/^\[4\]\s*/m, '')
                .replace(/^중요한 문장:?\s*/i, '')
                .split('\n')
                .map(line => line.replace(/^[-•–]\s*/, '').trim())
                .filter(line => line)
                .join('\n');
        }
        // summary: [5]~[6] 사이만 추출
        let summary = '';
        const summaryMatch = content.match(/^[\[]5\][\s\S]*?(?=^[\[]6\])/m);
        if (summaryMatch) {
            summary = summaryMatch[0].replace(/^\[5\]\s*:? ?/, '').trim();
        }
        const image_description = (content.match(/^[\[]6\]\s*:? ?([\s\S]+)$/m) || [])[1]?.trim() || '없음';

        // 주요 키워드 라벨도 자동 제거
        const main_keywords_clean = main_keywords.replace(/^주요 키워드:?\s*/i, '');

        // 라벨 제거: slide_title, concept_explanation, important_sentences
        const slide_title_clean = slide_title.replace(/^슬라이드 제목\(소주제\):?\s*/i, '');
        const concept_explanation_clean = concept_explanation.replace(/^개념 설명:?\s*/i, '');
        const important_sentences_clean = important_sentences.replace(/^중요한 문장:?\s*/i, '');

        return {
            slide_title: slide_title_clean,
            concept_explanation: concept_explanation_clean,
            main_keywords: main_keywords_clean,
            important_sentences: important_sentences_clean,
            summary,
            image_description
        };

    } catch (err) {
        console.error('GPT Vision 요약 오류:', err.response?.data || err.message);
        // 에러 전체를 프론트로 전달
        return { error: err.response?.data || err.message };
    }
}

/**
 * 전체 강의자료 요약 (슬라이드 요약 배열을 받아 전체 요약)
 * @param {string[]} slideSummaries - 슬라이드별 summary 배열
 * @returns {Promise<string>} - 전체 강의자료 요약
 */
async function summarizeMaterialWithGPT(slideSummaries) {
    const apiKey = process.env.OPENAI_API_KEY;
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const joined = slideSummaries.map((s, i) => `${i+1}. ${s}`).join('\n');
    const prompt = `아래는 한 강의자료의 각 슬라이드 요약입니다. 이 전체 내용을 바탕으로 강의자료 전체 내용을 5~7문장으로 요약해줘.\n\n[슬라이드별 요약]\n${joined}`;
    const messages = [
        { role: "system", content: "당신은 강의자료 전체 요약을 잘하는 AI입니다." },
        { role: "user", content: prompt }
    ];
    try {
        const response = await axios.post(
            endpoint,
            {
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 600,
                temperature: 0.5
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data.choices[0].message.content.trim();
    } catch (err) {
        console.error('GPT 전체 강의자료 요약 오류:', err.response?.data || err.message);
        throw err;
    }
}

module.exports = {
    summarizeWithGPT, // deprecated
    summarizeSlideWithGPT,
    summarizeMaterialWithGPT
}; 