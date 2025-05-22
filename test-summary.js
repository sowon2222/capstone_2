// test-summary.js
const summarizeWithGPT = require('./summarizeWithGPT');

(async () => {
    const slideText = `
TCP/IP 프로토콜 구조 (6)

■ 응용 계층
  ▪ 역할
    • 전송 계층을 기반으로 한 다수의 프로토콜과 이 프로토콜을 사용하는 응용 프로그램을 포괄
  ▪ 대표 프로토콜
    • Telnet, FTP, HTTP, SMTP, ...
    `;
    try {
        const summary = await summarizeWithGPT(slideText);
        console.log('요약 결과:', summary);
    } catch (err) {
        console.error('실행 중 오류:', err.message);
    }
})();