const pool = require('./config/database');

async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('MariaDB 연결 성공!');
        
        // 테스트 쿼리 실행
        const rows = await conn.query('SELECT 1 as val');
        console.log('테스트 쿼리 결과:', rows);
        
    } catch (err) {
        console.error('연결 에러:', err);
    } finally {
        if (conn) conn.release();
    }
}

testConnection(); 