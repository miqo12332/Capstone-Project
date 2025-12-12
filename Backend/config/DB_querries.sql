-- ======================
-- DROP TABLES (in dependency order)
-- ======================
DROP TABLE IF EXISTS user_group_challenges CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS busy_schedules CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS group_challenges CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;

-- ======================
-- USERS
-- ======================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(200) NOT NULL,
    age INT,
    gender VARCHAR(20),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- HABITS
-- ======================
CREATE TABLE habits (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    target_reps INT,
    is_daily_goal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- SCHEDULES
-- ======================
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    userid INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- ✅ correct reference to users
    day DATE NOT NULL,
    starttime TIME NOT NULL,
    endtime TIME,
    enddate DATE,
    repeat VARCHAR(50) DEFAULT 'daily',  -- daily, weekly, every3days, custom
    customdays VARCHAR(100),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- TASKS
-- ======================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    duration_minutes INT DEFAULT 60,
    min_duration_minutes INT,
    max_duration_minutes INT,
    split_up BOOLEAN DEFAULT FALSE,
    hours_label VARCHAR(120),
    schedule_after TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- BUSY SCHEDULES (non-habit events)
-- ======================
CREATE TABLE busy_schedules (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    day DATE NOT NULL,
    starttime TIME NOT NULL,
    endtime TIME,
    enddate DATE,
    repeat VARCHAR(50) DEFAULT 'daily',
    customdays VARCHAR(100),
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- PROGRESS
-- ======================
CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- completed, missed, skipped
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- ACHIEVEMENTS
-- ======================
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL
);

-- ======================
-- USER_ACHIEVEMENTS
-- ======================
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- FRIENDS
-- ======================
CREATE TABLE friends (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- ======================
-- GROUP CHALLENGES
-- ======================
CREATE TABLE group_challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USER_GROUP_CHALLENGES
-- ======================
CREATE TABLE user_group_challenges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INT NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, challenge_id)
);

-- ======================
-- NOTIFICATIONS
-- ======================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM assistant_memories WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM chat_messages WHERE sender_id NOT IN (SELECT id FROM users);