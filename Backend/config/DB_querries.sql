-- PostgreSQL schema reset + creation script
-- Run this file to rebuild the StepHabit database with all relationships.
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS group_challenge_messages CASCADE;
DROP TABLE IF EXISTS calendar_events CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS assistant_memories CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS registration_verifications CASCADE;
DROP TABLE IF EXISTS user_group_challenges CASCADE;
DROP TABLE IF EXISTS group_challenges CASCADE;
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS busy_schedules CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS habits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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
    avatar VARCHAR(255),
    primary_goal VARCHAR(150),
    focus_area VARCHAR(120),
    experience_level VARCHAR(60),
    daily_commitment VARCHAR(60),
    support_preference VARCHAR(120),
    motivation_statement TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USER SETTINGS
-- ======================
CREATE TABLE user_settings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- REGISTRATION VERIFICATION
-- ======================
CREATE TABLE registration_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    code_hash VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- ======================
-- PASSWORD RESET
-- ======================
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    code_hash VARCHAR(200) NOT NULL,
    expires_at TIMESTAMP NOT NULL
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
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    starttime TIME NOT NULL,
    endtime TIME,
    enddate DATE,
    repeat VARCHAR(50) DEFAULT 'daily',  -- daily, weekly, every3days, custom
    customdays VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    color VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- BUSY SCHEDULES (non-habit events)
-- ======================
CREATE TABLE busy_schedules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    day DATE NOT NULL,
    starttime TIME NOT NULL,
    endtime TIME,
    enddate DATE,
    repeat VARCHAR(50) DEFAULT 'daily',
    customdays VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- PROGRESS
-- ======================
CREATE TABLE progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- completed, missed, skipped
    reflected_reason TEXT,
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- ACHIEVEMENTS
-- ======================
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USER_ACHIEVEMENTS
-- ======================
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- ======================
-- FRIENDS
-- ======================
CREATE TABLE friends (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    share_habits BOOLEAN NOT NULL DEFAULT TRUE,
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
    creator_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approval_required BOOLEAN NOT NULL DEFAULT FALSE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- GROUP CHALLENGE MESSAGES
-- ======================
CREATE TABLE group_challenge_messages (
    id SERIAL PRIMARY KEY,
    challenge_id INT NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USER_GROUP_CHALLENGES
-- ======================
CREATE TABLE user_group_challenges (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INT NOT NULL REFERENCES group_challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'accepted',
    role VARCHAR(20) NOT NULL DEFAULT 'participant',
    invited_by INT REFERENCES users(id) ON DELETE SET NULL,
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
    metadata JSONB,
    scheduled_for TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cta_label VARCHAR(60),
    cta_url VARCHAR(255)
);

-- ======================
-- ASSISTANT MEMORIES
-- ======================
CREATE TABLE assistant_memories (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    keywords JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- CALENDAR INTEGRATIONS
-- ======================
CREATE TABLE calendar_integrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    label VARCHAR(120) NOT NULL,
    source_type VARCHAR(20) NOT NULL DEFAULT 'manual',
    source_url VARCHAR(255),
    external_id VARCHAR(120),
    metadata JSONB,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- CALENDAR EVENTS
-- ======================
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id INT NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    timezone VARCHAR(60),
    all_day BOOLEAN DEFAULT FALSE,
    source VARCHAR(40) NOT NULL DEFAULT 'calendar',
    external_event_id VARCHAR(160),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- DIRECT MESSAGES
-- ======================
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
