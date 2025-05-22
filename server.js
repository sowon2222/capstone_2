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
require('dotenv').config();

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
// <-- 여기 부분에 프론트랑 연결 --> app.use(express.static('public')); 이었던 곳임 

// MariaDB 연결 풀 설정
const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'study_platform',
    connectionLimit: 5
});

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" 형식에서 토큰 추출

    if (!token) {
        return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    jwt.verify(token, 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

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

// 회원가입 API
app.post('/api/register', async (req, res) => {
    let conn;
    try {
        const { username, password } = req.body;
        
        // 입력값 검증
        if (!username || !password) {
            return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
        }

        conn = await pool.getConnection();
        
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 사용자 생성
        const result = await conn.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        
        res.status(201).json({ 
            message: '회원가입이 완료되었습니다.',
            userId: result.insertId.toString()
        });
        
    } catch (err) {
        console.error('회원가입 중 오류:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: '이미 사용 중인 사용자 이름입니다.' });
        } else {
            res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
    } finally {
        if (conn) conn.release();
    }
});

// 로그인 API
app.post('/api/login', async (req, res) => {
    let conn;
    try {
        const { username, password } = req.body;
        
        // 입력값 검증
        if (!username || !password) {
            return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
        }

        conn = await pool.getConnection();
        
        // 사용자 조회
        const users = await conn.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        const user = users[0];
        
        // 비밀번호 확인
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 올바르지 않습니다.' });
        }
        
        // JWT 토큰 생성
        const token = jwt.sign(
            { userId: user.user_id, username: user.username },
            'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            message: '로그인 성공',
            token,
            user: {
                id: user.user_id,
                username: user.username
            }
        });
        
    } catch (err) {
        console.error('로그인 중 오류:', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// 사용자 정보 조회 API (토큰 필요)
app.get('/api/profile', authenticateToken, async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        
        const users = await conn.query(
            'SELECT user_id, username FROM users WHERE user_id = ?',
            [req.user.userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }
        
        res.json({
            user: users[0]
        });
        
    } catch (err) {
        console.error('프로필 조회 중 오류:', err);
        res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    } finally {
        if (conn) conn.release();
    }
});

// PDF 업로드 및 페이지 수 계산 API
app.post('/api/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'PDF 파일이 필요합니다.' });
    }

    const pdfPath = req.file.path;
    console.log('PDF 파일 경로:', pdfPath);
    
    try {
        // PDF 페이지 수 확인
        console.log('PDF 페이지 수 확인 시작');
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const numPages = pdfDoc.numPages;
        console.log('총 페이지 수:', numPages);
        
        // 강의자료 정보 저장 (페이지 수만)
        const result = await pool.query(
            'INSERT INTO lecture_materials (user_id, material_name, page, progress) VALUES (?, ?, ?, 0)',
            [req.user.userId, req.file.filename, numPages]
        );
        
        const materialId = result.insertId.toString();
        console.log('자료 ID:', materialId);
        
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
    try {
        const userId = req.user.userId;
        const results = await pool.query(
            'SELECT material_id, material_name, page, progress FROM lecture_materials WHERE user_id = ? ORDER BY material_id DESC',
            [userId]
        );
        // BigInt to string 처리
        const materials = results.map(mat => ({
            material_id: mat.material_id.toString(),
            title: mat.material_name,
            page: Number(mat.page),
            progress: Number(mat.progress)
        }));
        res.json({ materials });
    } catch (err) {
        res.status(500).json({ error: '자료 리스트 조회 오류' });
    }
});

// 특정 강의자료의 슬라이드 요약 전체
app.get('/archive/:lecture_id', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.lecture_id;
        const slides = await pool.query(
            'SELECT slide_number, original_text, summary FROM slides WHERE material_id = ? ORDER BY slide_number',
            [materialId]
        );
        res.json({ slides });
    } catch (err) {
        res.status(500).json({ error: '슬라이드 요약 조회 오류' });
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
            return res.json({ slide: existing });
        }

        // PDF 파일 경로 찾기
        const [material] = await pool.query(
            'SELECT material_name FROM lecture_materials WHERE material_id = ? AND user_id = ?',
            [materialId, req.user.userId]
        );
        if (!material) return res.status(404).json({ error: '자료 없음' });

        const pdfPath = path.join(__dirname, 'uploads', material.material_name);

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

        // GPT 구조화 요약
        const gptResult = await summarizeSlideWithGPT(text);
        // gptResult: { slide_title, concept_explanation, main_keywords, important_sentences, summary }

        // DB 저장 (구조화 컬럼 포함)
        const slideResult = await pool.query(
            'INSERT INTO slides (material_id, slide_number, original_text, slide_title, concept_explanation, main_keywords, important_sentences, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [materialId, slideNumber, text, gptResult.slide_title, gptResult.concept_explanation, gptResult.main_keywords, gptResult.important_sentences, gptResult.summary]
        );

        // 이미지 파일 삭제
        fs.unlinkSync(imagePath);

        // 진도율 계산
        const [totalSlides] = await pool.query(
            'SELECT COUNT(*) as total FROM slides WHERE material_id = ?',
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
            [req.user.userId, materialId]
        );
        const prevProgress = lastLog ? Number(lastLog.total_progress) : 0;
        const progressDelta = progress - prevProgress;

        // 오늘 study_progress_log에 기록 (있으면 update, 없으면 insert)
        const [existingLog] = await pool.query(
            'SELECT * FROM study_progress_log WHERE user_id = ? AND material_id = ? AND study_date = ?',
            [req.user.userId, materialId, today]
        );
        if (existingLog) {
            await pool.query(
                'UPDATE study_progress_log SET progress_delta = ?, total_progress = ? WHERE log_id = ?',
                [progressDelta, progress, existingLog.log_id]
            );
            console.log(`[UPDATE] study_progress_log: user_id=${req.user.userId}, material_id=${materialId}, date=${today}, progress=${progress}`);
        } else {
            await pool.query(
                'INSERT INTO study_progress_log (user_id, material_id, study_date, progress_delta, total_progress) VALUES (?, ?, ?, ?, ?)',
                [req.user.userId, materialId, today, progressDelta, progress]
            );
            console.log(`[INSERT] study_progress_log: user_id=${req.user.userId}, material_id=${materialId}, date=${today}, progress=${progress}`);
        }

        res.json({
            slide: {
                id: slideResult.insertId.toString(),
                slide_number: slideNumber,
                original_text: text,
                slide_title: gptResult.slide_title,
                concept_explanation: gptResult.concept_explanation,
                main_keywords: gptResult.main_keywords,
                important_sentences: gptResult.important_sentences,
                summary: gptResult.summary
            }
        });
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
    const { progress } = req.body;
    try {
        await pool.query(
            'UPDATE lecture_materials SET progress = ? WHERE material_id = ? AND user_id = ?',
            [progress, materialId, req.user.userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: '진도율 저장 오류' });
    }
});

// 깃허브 잔디느낌 오늘의 학습 intensity 계산
app.get('/api/study-intensity/today', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
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
    const userId = req.user.userId;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS는 0~11, SQL은 1~12

    const rows = await pool.query(
        'SELECT study_date, intensity_score FROM study_intensity_log WHERE user_id = ? AND YEAR(study_date) = ? AND MONTH(study_date) = ? ORDER BY study_date',
        [userId, year, month]
    );
    res.json({ data: rows });
});

// 오늘의 학습 시간 누적 API
app.post('/api/study-time', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
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
}); 