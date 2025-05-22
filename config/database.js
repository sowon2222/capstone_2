const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: 'localhost',
    user: 'root',     // MariaDB 설치 시 설정한 사용자 이름
    password: '',     // MariaDB 설치 시 설정한 비밀번호
    database: 'test', // 사용할 데이터베이스 이름
    connectionLimit: 5
});

module.exports = pool; 