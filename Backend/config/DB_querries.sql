-- ======================
-- DROP TABLES (in dependency order)
-- ======================
DROP TABLE IF EXISTS user_group_challenges CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
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
    title VARCHAR(140) NOT NULL DEFAULT 'Habit reminder',
    message TEXT NOT NULL,
    type VARCHAR(40) NOT NULL DEFAULT 'general',
    category VARCHAR(40) NOT NULL DEFAULT 'general',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    reference_id VARCHAR(80),
    metadata JSON,
    scheduled_for TIMESTAMP,
    email_sent_at TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cta_label VARCHAR(60),
    cta_url VARCHAR(255)
);

-- ======================
-- USER SETTINGS
-- ======================
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
    daily_reminder_time VARCHAR(10),
    weekly_summary_day VARCHAR(16) NOT NULL DEFAULT 'Sunday',
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    share_activity BOOLEAN NOT NULL DEFAULT TRUE,
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    ai_tone VARCHAR(30) NOT NULL DEFAULT 'balanced',
    support_style VARCHAR(30) NOT NULL DEFAULT 'celebrate',
    email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    push_reminders BOOLEAN NOT NULL DEFAULT FALSE,
    google_calendar BOOLEAN NOT NULL DEFAULT FALSE,
    apple_calendar BOOLEAN NOT NULL DEFAULT FALSE,
    fitness_sync BOOLEAN NOT NULL DEFAULT FALSE,
    last_reminder_sent_date VARCHAR(16),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM assistant_memories WHERE user_id NOT IN (SELECT id FROM users);
DELETE FROM chat_messages WHERE sender_id NOT IN (SELECT id FROM users);
