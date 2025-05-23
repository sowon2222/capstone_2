DROP DATABASE IF EXISTS study_platform;

-- Create database
CREATE DATABASE IF NOT EXISTS study_platform;
USE study_platform;

-- Create users table
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create lecture_materials table
CREATE TABLE `lecture_materials` (
  `material_id` int(11) NOT NULL AUTO_INCREMENT,    -- 강의 자료 고유 아이디
  `user_id` int(11) NOT NULL,                      -- 사용자 고유 아이디
  `material_name` varchar(255) NOT NULL,           -- 강의 자료 이름
  `progress` float NOT NULL DEFAULT 0,            -- 강의 자료 진행 상황
  `page` int(11) NOT NULL,                        -- 강의 자료 페이지 번호
  `created_at` timestamp NULL DEFAULT current_timestamp(), -- 강의 자료 생성 시간
  `summary` text DEFAULT NULL,                   -- 강의 자료 요약( 전체 요약 )
  PRIMARY KEY (`material_id`),
  UNIQUE KEY `material_name` (`material_name`),
  KEY `idx_materials_user` (`user_id`),
  CONSTRAINT `lecture_materials_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create slides table
CREATE TABLE `slides` (
  `slide_id` int(11) NOT NULL AUTO_INCREMENT,        -- 슬라이드 고유 아이디
  `material_id` int(11) NOT NULL,                    -- 강의 자료 고유 아이디 ( 무슨 강의자료에서 나왔는지 )
  `slide_number` int(11) NOT NULL,                  -- 슬라이드 번호 ( 몇 페이지에 있는 슬라이드인지 )
  `summary` text DEFAULT NULL,                     -- 슬라이드 요약 ( 슬라이드의 요약 내용 )
  `original_text` text DEFAULT NULL,                -- 슬라이드 원본 텍스트 ( 슬라이드의 원본 텍스트 )
  `slide_title` varchar(255) DEFAULT NULL,          -- 슬라이드 제목 ( 슬라이드의 제목 )
  `concept_explanation` text DEFAULT NULL,          -- 슬라이드 개념 설명 ( 슬라이드의 개념 설명 )
  `main_keywords` varchar(255) DEFAULT NULL,        -- 슬라이드의 주요 키워드 ( 슬라이드의 주요 키워드 )
  `important_sentences` text DEFAULT NULL,          -- 슬라이드의 중요한 문장 ( 슬라이드의 중요한 문장 )
  PRIMARY KEY (`slide_id`),
  KEY `idx_slides_material` (`material_id`),
  CONSTRAINT `slides_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `lecture_materials` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create keywords table
CREATE TABLE `keywords` (
  `keyword_id` int(11) NOT NULL AUTO_INCREMENT,
  `keyword_name` varchar(255) NOT NULL,
  PRIMARY KEY (`keyword_id`),
  UNIQUE KEY `keyword_name` (`keyword_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create slide_keywords table
CREATE TABLE `slide_keywords` (
  `slide_id` int(11) NOT NULL,
  `keyword_id` int(11) NOT NULL,
  PRIMARY KEY (`slide_id`, `keyword_id`),
  FOREIGN KEY (`slide_id`) REFERENCES `slides` (`slide_id`),
  FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create questions table
CREATE TABLE `questions` (
  `question_id` int(11) NOT NULL AUTO_INCREMENT,
  `slide_id` int(11) NOT NULL,
  `question_type` enum('객관식','주관식','참거짓','빈칸채우기') NOT NULL,
  `content` text NOT NULL,
  `answer` text NOT NULL,
  `explanation` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `difficulty` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`question_id`),
  KEY `idx_questions_slide` (`slide_id`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`slide_id`) REFERENCES `slides` (`slide_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create question_keywords table
CREATE TABLE `question_keywords` (
  `question_id` int(11) NOT NULL,
  `keyword_id` int(11) NOT NULL,
  PRIMARY KEY (`question_id`,`keyword_id`),
  KEY `keyword_id` (`keyword_id`),
  CONSTRAINT `question_keywords_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`),
  CONSTRAINT `question_keywords_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create question_attempts table
CREATE TABLE `question_attempts` (
  `attempt_id` int(11) NOT NULL AUTO_INCREMENT,             -- 시도 고유 아이디
  `user_id` int(11) NOT NULL,                               -- 사용자 고유 아이디
  `question_id` int(11) NOT NULL,                           -- 문제 고유 아이디
  `is_correct` tinyint(1) NOT NULL,                         -- 정답 여부
  `answer` text DEFAULT NULL,                               -- 사용자 답안
  `attempt_date` date NOT NULL DEFAULT curdate(),           -- 시도 날짜
  PRIMARY KEY (`attempt_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_qa_user_question` (`user_id`,`question_id`),
  CONSTRAINT `question_attempts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `question_attempts_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create daily_study_time table
CREATE TABLE `daily_study_time` (
  `study_date` date NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_time` int(11) NOT NULL,
  PRIMARY KEY (`study_date`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `daily_study_time_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create study_progress_log table
CREATE TABLE `study_progress_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,     -- 학습 진행 로그 고유 아이디
  `user_id` int(11) NOT NULL,                  -- 사용자 고유 아이디
  `material_id` int(11) NOT NULL,              -- 강의 자료 고유 아이디
  `study_date` date NOT NULL,                  -- 학습 날짜
  `progress_delta` float DEFAULT 0,            -- 학습 진행 변화량
  `total_progress` float DEFAULT 0,            -- 학습 진행 총량
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `study_progress_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `study_progress_log_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `lecture_materials` (`material_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create study_intensity_log table -> 잔디에 들어갈 값 저장 테이블 
CREATE TABLE `study_intensity_log` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,    -- 학습 강도 로그 고유 아이디   
  `user_id` int(11) NOT NULL,                  -- 사용자 고유 아이디
  `study_date` date NOT NULL,                  -- 학습 날짜
  `intensity_score` float DEFAULT 0,           -- 학습 강도 점수
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `study_intensity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create weak_keyword_logs table
CREATE TABLE `weak_keyword_logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,        -- 약한 키워드 로그 고유 아이디
  `user_id` int(11) NOT NULL,                      -- 사용자 고유 아이디
  `question_id` int(11) NOT NULL,                  -- 문제 고유 아이디
  `keyword_id` int(11) NOT NULL,                   -- 키워드 고유 아이디
  `is_incorrect` tinyint(1) NOT NULL,              -- 오답 여부
  `occurred_at` timestamp NOT NULL DEFAULT current_timestamp(), -- 발생 시간
  PRIMARY KEY (`log_id`),
  KEY `keyword_id` (`keyword_id`),
  KEY `question_id` (`question_id`),
  KEY `idx_wkl_user_keyword` (`user_id`,`keyword_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_2` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`keyword_id`),
  CONSTRAINT `weak_keyword_logs_ibfk_3` FOREIGN KEY (`question_id`) REFERENCES `questions` (`question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Create weak_keyword_stats view
CREATE VIEW `weak_keyword_stats` AS 
SELECT 
  `weak_keyword_logs`.`user_id` AS `user_id`,
  `weak_keyword_logs`.`keyword_id` AS `keyword_id`,
  count(0) AS `incorrect_count` 
FROM `weak_keyword_logs` 
WHERE `weak_keyword_logs`.`is_incorrect` = 1 
GROUP BY `weak_keyword_logs`.`user_id`,`weak_keyword_logs`.`keyword_id`; 

ALTER TABLE users ADD COLUMN name VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL;
