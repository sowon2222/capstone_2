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
 * @returns {Promise<object>} - { slide_title, concept_explanation, main_keywords, important_sentences, summary }
 */
async function summarizeSlideWithGPT(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const prompt = `아래 슬라이드 텍스트를 분석해서 반드시 아래 형식으로 답변해줘.\n\n[1] 슬라이드 제목(소주제): (간결하게)\n[2] 개념 설명: (한두 문장)\n[3] 주요 키워드: (쉼표로 구분, 예: 키워드1, 키워드2, ...)\n[4] 중요한 문장: (2~3개, 각 문장은 줄바꿈으로 구분)\n[5] 슬라이드 전체 요약: (3~4문장)\n\n예시:\n[1] TCP 연결 과정\n[2] TCP는 신뢰성 있는 데이터 전송을 위해 3-way handshake 과정을 거칩니다.\n[3] TCP, 3-way handshake, 연결, 데이터 전송\n[4] TCP는 신뢰성 있는 연결을 제공합니다.\n3-way handshake는 연결 설정에 사용됩니다.\n[5] TCP 연결은 3-way handshake 과정을 통해 시작되며, 이 과정은 데이터의 신뢰성 있는 전송을 보장합니다. 각 단계는 SYN, SYN-ACK, ACK 패킷을 주고받으며 연결이 성립됩니다.\n\n[슬라이드 텍스트]\n${text}`;
    const messages = [
        { role: "system", content: "당신은 학습자가 강의자료를 이해하기 쉽도록 요약해주는 AI입니다." },
        { role: "user", content: prompt }
    ];
    try {
        const response = await axios.post(
            endpoint,
            {
                model: "gpt-3.5-turbo",
                messages: messages,
                max_tokens: 700,
                temperature: 0.5
            },
            {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                }
            }
        );
        const content = response.data.choices[0].message.content.trim();
        // GPT 원본 답변 로그 출력
        console.log('GPT 슬라이드 요약 원본 답변:', content);
        // 1) Slide title: whatever follows "[1] "
        const slide_title = (
          content.match(/^\[1\]\s*:? ?\s*(.+)$/m) || []
        )[1]?.trim() || '';

        // 2) Concept explanation: "[2] "
        const concept_explanation = (
          content.match(/^\[2\]\s*:? ?\s*(.+)$/m) || []
        )[1]?.trim() || '';

        // 3) Main keywords: "[3] "
        const main_keywords = (
          content.match(/^\[3\]\s*:? ?\s*(.+)$/m) || []
        )[1]?.trim() || '';

        // 4) Important sentences: lines after "[4] " until the next "[5]"
        let important_sentences = '';
        const impMatch = content.match(
          /^\[4\][\s\S]*?(?=^\[5\])/m
        );
        if (impMatch) {
          // strip the "[4]" label and any leading dashes or whitespace
          important_sentences = impMatch[0]
            .replace(/^\[4\]\s*/m, '')
            .split('\n')
            .map(line => line.replace(/^[-•–]\s*/, '').trim())
            .filter(line => line)
            .join('\n');
        }

        // 5) Full summary: "[5] "
        const summary = (
          content.match(/^\[5\]\s*:? ?\s*([\s\S]+)$/m) || []
        )[1]?.trim() || '';

        console.log('파싱결과:', {
          slide_title,
          concept_explanation,
          main_keywords,
          important_sentences,
          summary
        });
        return { slide_title, concept_explanation, main_keywords, important_sentences, summary };
    } catch (err) {
        console.error('GPT 슬라이드 구조화 요약 오류:', err.response?.data || err.message);
        throw err;
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