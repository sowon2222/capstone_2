const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'study_platform',
    connectionLimit: 5
});

async function setupDatabase() {
    let conn;
    try {
        conn = await pool.getConnection();
        
        // materials 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS materials (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id BIGINT NOT NULL,
                title VARCHAR(255) NOT NULL,
                page_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        // slides 테이블 생성
        await conn.query(`
            CREATE TABLE IF NOT EXISTS slides (
                id BIGINT PRIMARY KEY AUTO_INCREMENT,
                material_id BIGINT NOT NULL,
                slide_number INT NOT NULL,
                original_text TEXT,
                summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (material_id) REFERENCES materials(id)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);

        console.log('테이블 생성 완료!');
    } catch (err) {
        console.error('데이터베이스 설정 중 오류:', err);
    } finally {
        if (conn) conn.release();
        await pool.end();
    }
}

setupDatabase(); 