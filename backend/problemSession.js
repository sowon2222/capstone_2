const express = require('express');
const router = express.Router();
const pool = require('./db'); // db.js에서 pool만 import
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '인증 토큰이 필요합니다.' });

    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }, (err, user) => {
        if (err) {
            console.error('JWT 검증 실패:', err);
            return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
        }
        req.user = user;
        next();
    });
};

// 문제풀이 세션 조회
router.get('/problem-session/:materialId', authenticateToken, async (req, res) => {
  const { materialId } = req.params;
  const userId = req.user.user_id;
  
  try {
    const session = await pool.query(
      'SELECT * FROM problem_solving_sessions WHERE user_id = ? AND material_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId, materialId]
    );
    
    const progress = await pool.query(
      'SELECT * FROM problem_solving_progress WHERE user_id = ? AND material_id = ?',
      [userId, materialId]
    );
    
    res.json({ session: session[0] || null, progress: progress[0] || null });
  } catch (error) {
    res.status(500).json({ error: '세션 조회 실패' });
  }
});

// 문제풀이 세션 업데이트
router.put('/problem-session/:sessionId', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const { questionId, isCorrect, currentRound } = req.body;
  
  let conn;
  try {
    // 트랜잭션 시작
    conn = await pool.getConnection();
    await conn.beginTransaction();
    
    // 세션 업데이트
    await conn.query(
      `UPDATE problem_solving_sessions 
       SET completed_questions = JSON_ARRAY_APPEND(
         COALESCE(completed_questions, '[]'), 
         '$', 
         CAST(? AS JSON)
       ),
       wrong_questions = JSON_ARRAY_APPEND(
         COALESCE(wrong_questions, '[]'), 
         '$', 
         CAST(? AS JSON)
       ),
       current_round = ?,
       last_question_id = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE session_id = ?`,
      [
        JSON.stringify(questionId),
        isCorrect ? null : JSON.stringify(questionId),
        currentRound,
        questionId,
        sessionId
      ]
    );
    
    // 진행 상태 업데이트
    await conn.query(
      `UPDATE problem_solving_progress 
       SET current_round = ?,
           completed_rounds = JSON_ARRAY_APPEND(
             COALESCE(completed_rounds, '[]'),
             '$',
             CAST(? AS JSON)
           ),
           last_session_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = (SELECT user_id FROM problem_solving_sessions WHERE session_id = ?)
       AND material_id = (SELECT material_id FROM problem_solving_sessions WHERE session_id = ?)`,
      [
        currentRound,
        JSON.stringify({ round: currentRound, completed_at: new Date() }),
        sessionId,
        sessionId,
        sessionId
      ]
    );
    
    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: '세션 업데이트 실패' });
  } finally {
    if (conn) conn.release();
  }
});

// 문제풀이 세션 생성
router.post('/problem-session', authenticateToken, async (req, res) => {
  let materialId = req.body.materialId;
  const userId = req.user.user_id;
  
  // materialId를 숫자로 변환
  if (typeof materialId === 'string') materialId = Number(materialId);

  // 유효성 체크
  if (!materialId || !userId) {
    return res.status(400).json({ error: 'materialId 또는 userId 누락' });
  }
  
  try {
    // 새 세션 생성
    const sessionResult = await pool.query(
      `INSERT INTO problem_solving_sessions 
       (user_id, material_id, current_round, completed_questions, wrong_questions)
       VALUES (?, ?, 1, '[]', '[]')`,
      [userId, materialId]
    );
    
    // 새 진행 상태 생성
    const progressResult = await pool.query(
      `INSERT INTO problem_solving_progress 
       (user_id, material_id, total_rounds, current_round, completed_rounds)
       VALUES (?, ?, 1, 1, '[]')`,
      [userId, materialId]
    );
    
    res.json({ 
      session_id: sessionResult.insertId,
      current_round: 1
    });
  } catch (error) {
    console.error('세션 생성 실패:', error); // 실제 에러 로그 확인
    res.status(500).json({ error: '세션 생성 실패' });
  }
});

// 문제 채점 후 점수 저장
router.post('/problem-session/:sessionId/score', authenticateToken, async (req, res) => {
  const { sessionId } = req.params;
  const sessionIdNum = Number(sessionId); // 숫자로 변환
  const { score } = req.body;
  // sessionId로 user_id, material_id, current_round 조회
  const rows = await pool.query(
    'SELECT user_id, material_id, current_round FROM problem_solving_sessions WHERE session_id = ?',
    [sessionIdNum]
  );
  console.log('score 저장용 세션 rows:', rows);
  const session = rows && rows.length > 0 ? rows[0] : null;
  if (!session) {
    return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. 점수 저장 (중복 라운드 덮어쓰기)
    await conn.query(
      `INSERT INTO problem_solving_scores (user_id, material_id, round, score)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE score = VALUES(score), created_at = CURRENT_TIMESTAMP`,
      [session.user_id, session.material_id, session.current_round, score]
    );

    // 2. 세션의 current_round 증가
    await conn.query(
      `UPDATE problem_solving_sessions 
       SET current_round = current_round + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE session_id = ?`,
      [sessionIdNum]
    );

    // 3. 진행상황의 current_round도 증가
    await conn.query(
      `UPDATE problem_solving_progress 
       SET current_round = current_round + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND material_id = ?`,
      [session.user_id, session.material_id]
    );

    await conn.commit();
    res.json({ success: true });
  } catch (error) {
    if (conn) await conn.rollback();
    console.error('점수 저장 실패:', error);
    res.status(500).json({ error: '점수 저장 실패' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
