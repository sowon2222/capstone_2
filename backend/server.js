const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mariadb = require('mariadb');
const path = require('path');
const multer = require('multer');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const { summarizeWithGPT, summarizeSlideWithGPT, summarizeMaterialWithGPT } = require('./summarizeWithGPT');
const { fromPath } = require('pdf2pic');
const sharp = require('sharp');
const problemSessionRouter = require('./problemSession');
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.use(cors({
  origin: '*', // 또는 ["http://localhost:3000", "http://localhost:5500"] 등으로 제한 가능
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// <-- 여기 부분에 프론트랑 연결 --> app.use(express.static('public')); 이었던 곳임 

// MariaDB 연결 풀 설정
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectionLimit: 5,
    allowPublicKeyRetrieval: true
});


// 업로드 폴더 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // 한글 파일명 처리
        const decodedFilename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + decodedFilename);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('PDF 파일만 업로드 가능합니다.'));
        }
        cb(null, true);
    }
});


const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '인증 토큰이 필요합니다.' });

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
        if (err) {
            console.error('JWT 검증 실패:', err);
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }
        console.log('디코딩된 JWT payload:', user);
        req.user = user;
        next();
    });
};

// PDF 업로드 및 페이지 수 계산 API
app.post('/api/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    const pdfPath = req.file.path;
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8'); // 한글 파일명 복원

    try {
        // PDF 페이지 수 확인
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdfDoc.numPages;

        // 1. DB에 원본 파일명 저장
        const result = await pool.query(
            'INSERT INTO lecture_materials (user_id, material_name, page, progress) VALUES (?, ?, ?, 0)',
            [req.user.user_id, originalName, numPages]
        );
        const materialId = result.insertId.toString();

        // 2. 서버에는 material_id로 파일명 변경
        const ext = path.extname(originalName) || '.pdf';
        const newFilename = `${materialId}${ext}`;
        const newPath = path.join('uploads', newFilename);
        fs.renameSync(pdfPath, newPath);

        // (DB에는 이미 원본 파일명 저장했으니, material_name 업데이트 필요 없음)

        res.json({
            material_id: materialId,
            total_pages: numPages
        });
    } catch (error) {
        console.error('파일 처리 중 오류:', error);
        res.status(500).json({ error: '파일 처리 중 오류가 발생했습니다.' });
    }
});

// 사용자 업로드 자료 리스트 (제목만)
app.get('/archive/list', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    try {
        // 1. 자료 리스트만 먼저 가져오기
        const materials = await pool.query(
            `SELECT material_id, material_name, page, progress, created_at
             FROM lecture_materials
             WHERE user_id = ?
             ORDER BY material_id DESC`,
            [userId]
        );

        // 2. 각 자료별로 quiz_count, scores 조회해서 합치기
        for (const mat of materials) {
            // quiz_count
            const [quizCountRow] = await pool.query(
                `SELECT COUNT(*) AS quiz_count
                 FROM questions q
                 JOIN slides s ON q.slide_id = s.slide_id
                 WHERE s.material_id = ?`,
                [mat.material_id]
            );
            mat.quiz_count = quizCountRow ? Number(quizCountRow.quiz_count) : 0;

            // scores (라운드별 하나씩만)
            const scores = await pool.query(
                `SELECT round, score
                 FROM problem_solving_scores
                 WHERE user_id = ? AND material_id = ?
                 GROUP BY round
                 ORDER BY round`,
                [userId, mat.material_id]
            );
            mat.scores = scores || [];
        }

        // 3. 프론트에 맞게 가공
        const result = materials.map(mat => ({
            material_id: mat.material_id.toString(),
            title: mat.material_name,
            page: Number(mat.page),
            progress: Number(mat.progress),
            created_at: mat.created_at,
            has_quiz: mat.quiz_count > 0,
            scores: mat.scores
        }));

        res.json({ materials: result });
    } catch (err) {
        console.error('자료 리스트 조회 오류:', err);
        res.status(500).json({ error: '자료 리스트 조회 오류' });
    }
});

// 특정 강의자료의 슬라이드 요약 전체
app.get('/archive/:lecture_id', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.lecture_id;
        console.log('archive 요청 materialId:', materialId);
        const slides = await pool.query(
            'SELECT slide_id, slide_number, original_text, summary, image_url, image_description, slide_title, concept_explanation, main_keywords, important_sentences FROM slides WHERE material_id = ? ORDER BY slide_number',
            [materialId]
        );
        console.log('slides 결과:', slides);
        res.json({ slides: (slides || []).map(s => ({
            slide_id: s.slide_id,
            slide_number: s.slide_number,
            original_text: s.original_text,
            summary: s.summary,
            image_url: s.image_url,
            image_description: s.image_description,
            slide_title: s.slide_title,
            concept_explanation: s.concept_explanation,
            main_keywords: s.main_keywords,
            important_sentences: s.important_sentences
        })) });
    } catch (err) {
        console.error('슬라이드 요약 조회 오류:', err);
        res.status(500).json({ error: '슬라이드 요약 조회 오류' });
    }
});


// 오늘의 학습 시간 누적 API
app.post('/api/study-time', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    const { duration } = req.body; // 초 단위
    const today = new Date().toISOString().slice(0, 10);

    try {
        // 오늘 기록이 있으면 누적, 없으면 새로 생성
        const [row] = await pool.query(
            'SELECT * FROM daily_study_time WHERE user_id = ? AND study_date = ?',
            [userId, today]
        );
        if (row) {
            await pool.query(
                'UPDATE daily_study_time SET total_time = total_time + ? WHERE user_id = ? AND study_date = ?',
                [duration, userId, today]
            );
            console.log(`[UPDATE] daily_study_time: user_id=${userId}, date=${today}, +${duration}초`);
        } else {
            await pool.query(
                'INSERT INTO daily_study_time (user_id, study_date, total_time) VALUES (?, ?, ?)',
                [userId, today, duration]
            );
            console.log(`[INSERT] daily_study_time: user_id=${userId}, date=${today}, duration=${duration}`);
        }

        // intensity 점수 계산
        const sql = `
            SELECT 
                d.study_date,
                ROUND(
                    (IFNULL(MAX(spl.total_progress),0) * 0.35) +     -- 오늘 진도율(%) 35%
                    (COUNT(DISTINCT qa.question_id) * 0.25) +         -- 문제 풀이 수 25%
                    (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END) * 0.20) +  -- 정답 수 20%
                    (IFNULL(d.total_time,0) * 0.20),                 -- 학습 시간 20%
                    2
                ) AS intensity_score
            FROM daily_study_time d
            LEFT JOIN study_progress_log spl ON d.user_id = spl.user_id AND d.study_date = spl.study_date
            LEFT JOIN question_attempts qa ON d.user_id = qa.user_id AND d.study_date = qa.attempt_date
            LEFT JOIN questions q ON qa.question_id = q.question_id
            LEFT JOIN lecture_materials lm ON d.user_id = lm.user_id AND DATE(lm.created_at) = d.study_date
            WHERE d.user_id = ? AND d.study_date = CURDATE()
            GROUP BY d.study_date
        `;
        const [row2] = await pool.query(sql, [userId]);
        console.log('intensity row2:', row2);
        const intensityScore = row2 && row2.intensity_score ? row2.intensity_score : 0;

        // intensity_log에 무조건 INSERT/UPDATE
        const [existing] = await pool.query(
            'SELECT * FROM study_intensity_log WHERE user_id = ? AND study_date = ?',
            [userId, today]
        );
        if (existing) {
            await pool.query(
                'UPDATE study_intensity_log SET intensity_score = ? WHERE log_id = ?',
                [intensityScore, existing.log_id]
            );
            console.log(`[UPDATE] study_intensity_log: user_id=${userId}, date=${today}, score=${intensityScore}`);
        } else {
            await pool.query(
                'INSERT INTO study_intensity_log (user_id, study_date, intensity_score) VALUES (?, ?, ?)',
                [userId, today, intensityScore]
            );
            console.log(`[INSERT] study_intensity_log: user_id=${userId}, date=${today}, score=${intensityScore}`);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('학습 시간 저장 오류:', err);
        res.status(500).json({ error: '학습 시간 저장 오류' });
    }
});

// 오늘의 학습 시간(누적) API
app.get('/api/study-time/total', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    const today = new Date().toISOString().slice(0, 10);
    try {
        const [row] = await pool.query(
            'SELECT total_time FROM daily_study_time WHERE user_id = ? AND study_date = ?',
            [userId, today]
        );
        res.json({ total_time: row ? Number(row.total_time) : 0 });
    } catch (err) {
        res.status(500).json({ error: '오늘의 학습 시간 조회 오류' });
    }
});

// 특정 슬라이드 요약 API
app.post('/archive/:lecture_id/slide/:slide_number/summary', authenticateToken, async (req, res) => {
    const materialId = req.params.lecture_id;
    const slideNumber = parseInt(req.params.slide_number, 10);

    try {
        // 이미 요약이 있으면 반환
        const [existing] = await pool.query(
            'SELECT * FROM slides WHERE material_id = ? AND slide_number = ?',
            [materialId, slideNumber]
        );
        if (existing) {
            // main_keywords를 배열로 변환
            const mainKeywordsArr = existing.main_keywords ? existing.main_keywords.split(',').map(k => k.trim()) : [];
            return res.json({ slide: existing, slide_id: existing.slide_id, main_keywords: mainKeywordsArr });
        }

        // PDF 파일 경로 찾기
        const [material] = await pool.query(
            'SELECT material_name FROM lecture_materials WHERE material_id = ? AND user_id = ?',
            [materialId, req.user.user_id]
        );
        if (!material) return res.status(404).json({ error: '자료 없음' });

        const pdfPath = path.join(__dirname, 'uploads', `${materialId}.pdf`);

        // PDF → 이미지 변환
        const pdf2picOptions = { 
            density: 150, 
            saveFilename: "slide", 
            savePath: "./uploads", 
            format: "png", 
            width: 1200, 
            height: 900 
        };
        const converter = fromPath(pdfPath, pdf2picOptions);
        const pageImage = await converter(slideNumber);
        const imagePath = pageImage.path;

        // OCR
        const { data: { text } } = await Tesseract.recognize(imagePath, 'kor+eng');

        // 이미지를 sharp로 리사이즈(최대 1024px) 후 파일로 저장
        // 이미지 저장 파일명: m_<materialId>_s_<slideNumber>.png
        const customImageName = `m_${materialId}_s_${slideNumber}.png`;
        const customImagePath = path.join(path.dirname(imagePath), customImageName);
        const resizedBuffer = await sharp(fs.readFileSync(imagePath))
          .resize({ width: 1024, height: 1024, fit: 'inside' })
          .png()
          .toBuffer();
        fs.writeFileSync(customImagePath, resizedBuffer);
        // 퍼블릭 URL 환경변수 사용 (ngrok 등)
        const publicBaseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const imageUrl = `${publicBaseUrl}/uploads/${customImageName}`;

        // GPT 구조화 요약 (image_url만 전달)
        const gptResult = await summarizeSlideWithGPT(text, imageUrl);
        // gptResult: { slide_title, concept_explanation, main_keywords, important_sentences, summary, image_description }

        // main_keywords 처리 (문자열 → 배열)
        let mainKeywordsArr = [];
        if (gptResult.main_keywords) {
            mainKeywordsArr = gptResult.main_keywords.split(',').map(k => k.trim()).filter(Boolean);
        }
        // keywords 테이블에 저장 및 slide_keywords 연결
        let firstKeywordId = null;
        for (let i = 0; i < mainKeywordsArr.length; i++) {
            const keyword = mainKeywordsArr[i];
            // 1. keywords 테이블에 존재하는지 확인
            const [existingKeyword] = await pool.query(
                'SELECT keyword_id FROM keywords WHERE keyword_name = ?',
                [keyword]
            );
            let keywordId;
            if (existingKeyword) {
                keywordId = existingKeyword.keyword_id;
            } else {
                const result = await pool.query(
                    'INSERT INTO keywords (keyword_name) VALUES (?)',
                    [keyword]
                );
                keywordId = result.insertId;
            }
            // 2. slide_keywords 테이블에 연결
            // (slide_id는 아래에서 생성 후 연결)
            if (i === 0) firstKeywordId = keywordId;
        }

        // DB 저장 (구조화 컬럼 포함)
        console.log('[슬라이드 요약 생성] materialId:', materialId, 'slideNumber:', slideNumber);
        console.log('[슬라이드 요약 생성] gptResult:', gptResult);
        const slideResult = await pool.query(
            'INSERT INTO slides (material_id, slide_number, original_text, slide_title, concept_explanation, main_keywords, important_sentences, summary, image_url, image_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [materialId, slideNumber, text, gptResult.slide_title, gptResult.concept_explanation, gptResult.main_keywords, gptResult.important_sentences, gptResult.summary, `/uploads/${customImageName}`, gptResult.image_description]
        );
        const slideId = slideResult.insertId;
        console.log('[슬라이드 요약 생성] slideId:', slideId);

        // slide_keywords 연결 (슬라이드당 첫 번째 키워드만)
        if (firstKeywordId) {
            await pool.query(
                'INSERT IGNORE INTO slide_keywords (slide_id, keyword_id) VALUES (?, ?)',
                [slideId, firstKeywordId]
            );
        }

        // 이미지 파일 삭제
        //fs.unlinkSync(imagePath);

        // 진도율 계산
        const [totalSlides] = await pool.query(
            'SELECT COUNT(DISTINCT slide_number) as total FROM slides WHERE material_id = ?',
            [materialId]
        );
        const [materialInfo] = await pool.query(
            'SELECT page FROM lecture_materials WHERE material_id = ?',
            [materialId]
        );
        const totalSlidesCount = Number(totalSlides.total);
        const totalPages = Number(materialInfo.page);
        const progress = (totalSlidesCount / totalPages) * 100;

        // 강의자료 테이블에 진도율 업데이트
        await pool.query(
            'UPDATE lecture_materials SET progress = ? WHERE material_id = ?',
            [progress, materialId]
        );

        // 오늘 날짜
        const today = new Date().toISOString().slice(0, 10);

        // 오늘 이전의 누적 진도율
        const [lastLog] = await pool.query(
            'SELECT total_progress FROM study_progress_log WHERE user_id = ? AND material_id = ? ORDER BY study_date DESC LIMIT 1',
            [req.user.user_id, materialId]
        );
        const prevProgress = lastLog ? Number(lastLog.total_progress) : 0;
        const progressDelta = progress - prevProgress;

        // 오늘 study_progress_log에 기록 (있으면 update, 없으면 insert)
        const [existingLog] = await pool.query(
            'SELECT * FROM study_progress_log WHERE user_id = ? AND material_id = ? AND study_date = ?',
            [req.user.user_id, materialId, today]
        );
        if (existingLog) {
            await pool.query(
                'UPDATE study_progress_log SET progress_delta = ?, total_progress = ? WHERE log_id = ?',
                [progressDelta, progress, existingLog.log_id]
            );
            console.log(`[UPDATE] study_progress_log: user_id=${req.user.user_id}, material_id=${materialId}, date=${today}, progress=${progress}`);
        } else {
            await pool.query(
                'INSERT INTO study_progress_log (user_id, material_id, study_date, progress_delta, total_progress) VALUES (?, ?, ?, ?, ?)',
                [req.user.user_id, materialId, today, progressDelta, progress]
            );
            console.log(`[INSERT] study_progress_log: user_id=${req.user.user_id}, material_id=${materialId}, date=${today}, progress=${progress}`);
        }

        // BigInt를 문자열로 변환
        function replacer(key, value) {
            return typeof value === 'bigint' ? value.toString() : value;
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            slide: {
                id: slideId.toString(),
                slide_number: slideNumber,
                original_text: text,
                slide_title: gptResult.slide_title,
                concept_explanation: gptResult.concept_explanation,
                main_keywords: gptResult.main_keywords,
                important_sentences: gptResult.important_sentences,
                summary: gptResult.summary,
                image_url: `/uploads/${customImageName}`,
                image_description: gptResult.image_description
            },
            slide_id: slideId,
            main_keywords: mainKeywordsArr
        }, replacer));
    } catch (err) {
        console.error('슬라이드 요약 오류:', err);
        res.status(500).json({ error: '슬라이드 요약 오류' });
    }
});


// 전체 강의자료 요약 API
app.post('/archive/:lecture_id/summary', authenticateToken, async (req, res) => {
    const materialId = req.params.lecture_id;
    try {
        // 모든 슬라이드 summary 가져오기
        const slides = await pool.query(
            'SELECT summary FROM slides WHERE material_id = ? ORDER BY slide_number',
            [materialId]
        );
        const slideSummaries = slides.map(s => s.summary);

        // GPT 전체 요약
        const overallSummary = await summarizeMaterialWithGPT(slideSummaries);

        // DB에 저장
        await pool.query(
            'UPDATE lecture_materials SET summary = ? WHERE material_id = ?',
            [overallSummary, materialId]
        );

        res.json({ summary: overallSummary });
    } catch (err) {
        console.error('전체 요약 오류:', err);
        res.status(500).json({ error: '전체 요약 오류' });
    }
});

// 루트 경로에 대한 응답 추가
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 진도율 저장 API
app.post('/archive/:lecture_id/progress', authenticateToken, async (req, res) => {
    const materialId = req.params.lecture_id;
    // const { progress } = req.body; // 프론트에서 progress를 받아오지 않음
    try {
        // slides 테이블에서 material_id에 해당하는 슬라이드 개수
        const [slideCountRow] = await pool.query(
            'SELECT COUNT(*) as cnt FROM slides WHERE material_id = ?',
            [materialId]
        );
        const slideCount = Number(slideCountRow.cnt);
        // 전체 슬라이드(page) 개수
        const [materialRow] = await pool.query(
            'SELECT page FROM lecture_materials WHERE material_id = ?',
            [materialId]
        );
        const totalPages = Number(materialRow.page);
        const progress = totalPages > 0 ? (slideCount / totalPages) * 100 : 0;
        await pool.query(
            'UPDATE lecture_materials SET progress = ? WHERE material_id = ? AND user_id = ?',
            [progress, materialId, req.user.user_id]
        );
        res.json({ success: true, progress });
    } catch (err) {
        res.status(500).json({ error: '진도율 저장 오류' });
    }
});

// 깃허브 잔디느낌 오늘의 학습 intensity 계산
app.get('/api/study-intensity/today', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    const sql = `
        SELECT 
            d.study_date,
            ROUND(
                (IFNULL(MAX(spl.total_progress),0) * 0.35) +     -- 오늘 진도율(%) 35%
                (COUNT(DISTINCT qa.question_id) * 0.25) +         -- 문제 풀이 수 25%
                (SUM(CASE WHEN qa.is_correct THEN 1 ELSE 0 END) * 0.20) +  -- 정답 수 20%
                (IFNULL(d.total_time,0) * 0.20),                 -- 학습 시간 20%
                2
            ) AS intensity_score
        FROM daily_study_time d
        LEFT JOIN study_progress_log spl ON d.user_id = spl.user_id AND d.study_date = spl.study_date
        LEFT JOIN question_attempts qa ON d.user_id = qa.user_id AND d.study_date = qa.attempt_date
        LEFT JOIN questions q ON qa.question_id = q.question_id
        LEFT JOIN lecture_materials lm ON d.user_id = lm.user_id AND DATE(lm.created_at) = d.study_date
        WHERE d.user_id = ? AND d.study_date = CURDATE()
        GROUP BY d.study_date
    `;
    try {
        const [row] = await pool.query(sql, [userId]);
        res.json({ 
            date: row ? row.study_date : null, 
            intensity_score: row ? row.intensity_score : 0 
        });

        // 오늘 기록이 이미 있으면 update, 없으면 insert
        if (row) {
            const [existing] = await pool.query(
                'SELECT * FROM study_intensity_log WHERE user_id = ? AND study_date = ?',
                [userId, row.study_date]
            );
            if (existing) {
                await pool.query(
                    'UPDATE study_intensity_log SET intensity_score = ? WHERE log_id = ?',
                    [row.intensity_score, existing.log_id]
                );
                console.log(`[UPDATE] study_intensity_log: user_id=${userId}, date=${row.study_date}, score=${row.intensity_score}`);
            } else {
                await pool.query(
                    'INSERT INTO study_intensity_log (user_id, study_date, intensity_score) VALUES (?, ?, ?)',
                    [userId, row.study_date, row.intensity_score]
                );
                console.log(`[INSERT] study_intensity_log: user_id=${userId}, date=${row.study_date}, score=${row.intensity_score}`);
            }
        }
    } catch (err) {
        res.status(500).json({ error: '학습 intensity 계산 오류' });
    }
});

// 이번 달 intensity_score 전체 조회 API
app.get('/api/study-intensity/month', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS는 0~11, SQL은 1~12

    const rows = await pool.query(
        'SELECT study_date, intensity_score FROM study_intensity_log WHERE user_id = ? AND YEAR(study_date) = ? AND MONTH(study_date) = ? ORDER BY study_date',
        [userId, year, month]
    );
    res.json({ data: rows });
});

// 특정 강의자료의 슬라이드 리스트 반환
app.get('/slides/material/:material_id', authenticateToken, async (req, res) => {
    const materialId = req.params.material_id;
    try {
        const slides = await pool.query(
            'SELECT * FROM slides WHERE material_id = ? ORDER BY slide_number',
            [materialId]
        );
        res.json(slides);
    } catch (err) {
        res.status(500).json({ error: '슬라이드 리스트 조회 오류' });
    }
});

// 특정 슬라이드에 연결된 키워드 리스트 반환
app.get('/slides/:slide_id/keywords', authenticateToken, async (req, res) => {
    const slideId = req.params.slide_id;
    try {
        const keywords = await pool.query(
            `SELECT k.keyword_id, k.keyword_name
             FROM slide_keywords sk
             JOIN keywords k ON sk.keyword_id = k.keyword_id
             WHERE sk.slide_id = ?`,
            [slideId]
        );
        res.json(keywords);
    } catch (err) {
        res.status(500).json({ error: '키워드 리스트 조회 오류' });
    }
});

// 랭킹 API
app.get('/api/ranking', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    try {
        // 전체 사용자 수 조회
        const [totalUsers] = await pool.query('SELECT COUNT(*) as total FROM users');
        const totalUsersNum = Number(totalUsers.total);

        // 사용자의 학습 강도 점수 조회
        const [userScore] = await pool.query(
            'SELECT intensity_score FROM study_intensity_log WHERE user_id = ? ORDER BY study_date DESC LIMIT 1',
            [userId]
        );
        const userScoreVal = userScore ? Number(userScore.intensity_score) : 0;

        // 사용자보다 높은 점수를 가진 사용자 수 조회
        const [higherScores] = await pool.query(
            'SELECT COUNT(DISTINCT user_id) as count FROM study_intensity_log WHERE intensity_score > ?',
            [userScoreVal]
        );
        const higherScoresNum = Number(higherScores.count);

        const rank = higherScoresNum + 1;
        const percentile = totalUsersNum > 0 ? Math.round((rank / totalUsersNum) * 100) : 100;

        res.json({
            rank,
            percentile,
            total_users: totalUsersNum
        });
    } catch (err) {
        console.error('랭킹 조회 오류:', err);
        res.status(500).json({ error: '랭킹 조회 오류' });
    }
});

// 피드백 API
app.get('/api/feedback', authenticateToken, async (req, res) => {
    const userId = req.user.user_id;
    try {
        // 먼저 문제를 풀었는지 확인
        const [hasAttempts] = await pool.query(
            'SELECT COUNT(*) as count FROM question_attempts WHERE user_id = ?',
            [userId]
        );
        
        if (Number(hasAttempts.count) === 0) {
            return res.json({
                message: "🎯 아직 풀어본 문제가 없네요! 문제를 풀어보고 피드백을 받아보세요!"
            });
        }

        // 가장 오답률이 높은 키워드 조회
        const [weakKeyword] = await pool.query(
            `SELECT k.keyword_name, COUNT(*) as incorrect_count
             FROM weak_keyword_logs wkl
             JOIN keywords k ON wkl.keyword_id = k.keyword_id
             WHERE wkl.user_id = ? AND wkl.is_incorrect = TRUE
             GROUP BY k.keyword_id
             ORDER BY incorrect_count DESC
             LIMIT 1`,
            [userId]
        );
        
        if (weakKeyword) {
            res.json({
                message: `📈 오답률이 높은 자료는 ${weakKeyword.keyword_name} 영역입니다. "이런 부분을 더 공부하세요!"`
            });
        } else {
            res.json({
                message: "🎉 아직 모든 영역에서 좋은 성과를 보이고 있습니다!"
            });
        }
    } catch (err) {
        console.error('피드백 조회 오류:', err);
        res.status(500).json({ error: '피드백 조회 오류' });
    }
});

// 학습 세션 시작 API
app.post('/api/study-session/start', authenticateToken, async (req, res) => {
    const { materialId } = req.body;
    const userId = req.user.user_id;
    try {
        // 이미 활성화된 세션이 있으면 재사용
        const sessions = await pool.query(
            'SELECT * FROM study_sessions WHERE user_id = ? AND material_id = ? AND status = "active"',
            [userId, materialId]
        );
        if (sessions.length > 0) {
            return res.json({ sessionId: sessions[0].session_id });
        }
        // 없으면 새 세션 생성
        const result = await pool.query(
            'INSERT INTO study_sessions (user_id, material_id) VALUES (?, ?)',
            [userId, materialId]
        );
        res.json({ sessionId: result.insertId });
    } catch (err) {
        console.error('세션 시작 오류:', err);
        res.status(500).json({ error: '세션 시작 오류' });
    }
});

// 세션 누적시간 조회 API
app.get('/api/study-session/:sessionId', authenticateToken, async (req, res) => {
    const sessionId = req.params.sessionId;
    const userId = req.user.user_id;
    try {
        const [session] = await pool.query(
            'SELECT total_duration FROM study_sessions WHERE session_id = ? AND user_id = ?',
            [sessionId, userId]
        );
        res.json({ total_duration: session ? session.total_duration : 0 });
    } catch (err) {
        res.status(500).json({ error: '세션 시간 조회 오류' });
    }
});

// 키워드로 슬라이드 검색 API
app.get('/api/keyword/:keyword/slides', authenticateToken, async (req, res) => {
    const keyword = req.params.keyword;
    const userId = req.user.user_id;
    try {
        const slides = await pool.query(
            `SELECT s.*, lm.material_name 
             FROM slides s
             JOIN lecture_materials lm ON s.material_id = lm.material_id
             JOIN slide_keywords sk ON s.slide_id = sk.slide_id
             JOIN keywords k ON sk.keyword_id = k.keyword_id
             WHERE k.keyword_name = ? AND lm.user_id = ?
             ORDER BY lm.created_at DESC, s.slide_number`,
            [keyword, userId]
        );
        res.json(slides);
    } catch (err) {
        console.error('키워드 슬라이드 검색 오류:', err);
        res.status(500).json({ error: '키워드 슬라이드 검색 오류' });
    }
});

// 특정 question_id로 슬라이드 요약 반환
app.get('/api/question/:question_id/slide-summary', authenticateToken, async (req, res) => {
    const questionId = req.params.question_id;
    try {
        // 1. question_id로 slide_id 찾기
        const [question] = await pool.query(
            'SELECT slide_id FROM questions WHERE question_id = ?',
            [questionId]
        );
        if (!question) return res.status(404).json({ error: '해당 문제 없음' });

        // 2. slide_id로 slide summary 등 정보 찾기
        const [slide] = await pool.query(
            'SELECT slide_id, slide_number, summary, slide_title, concept_explanation, material_id FROM slides WHERE slide_id = ?',
            [question.slide_id]
        );
        if (!slide) return res.status(404).json({ error: '해당 슬라이드 없음' });

        // 3. 자료명도 추가로 반환
        const [material] = await pool.query(
            'SELECT material_name FROM lecture_materials WHERE material_id = ?',
            [slide.material_id]
        );

        res.json({
            ...slide,
            material_name: material ? material.material_name : null
        });
    } catch (err) {
        console.error('슬라이드 요약 조회 오류:', err);
        res.status(500).json({ error: '슬라이드 요약 조회 오류' });
    }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    
    // 라우트 정보 출력
    console.log('\n등록된 라우트 목록:');
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            // 라우트 정보 출력
            const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
            console.log(`${methods} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            // 미들웨어 정보 출력
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
                    console.log(`${methods} ${handler.route.path}`);
                }
            });
        }
    });

    console.log('JWT_SECRET:', process.env.JWT_SECRET);
});

// BigInt를 문자열로 변환하는 함수 추가
BigInt.prototype.toJSON = function() {
    return this.toString();
};

app.use('/api', problemSessionRouter); 
