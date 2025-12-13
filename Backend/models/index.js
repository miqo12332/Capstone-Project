// /models/index.js
// Centralises model imports and associations so every module works with the same
// relationships.  This file is imported by the server on startup which ensures
// all associations are registered exactly once.

import User from "./User.js";
import Habit from "./Habit.js";
import Schedule from "./Schedule.js";
import BusySchedule from "./BusySchedule.js";
import Progress from "./Progress.js";
import Task from "./Task.js";
import Notification from "./Notification.js";
import Achievement from "./Achievement.js";
import UserAchievement from "./UserAchievement.js";
import Friend from "./Friend.js";
import GroupChallenge from "./GroupChallenge.js";
import UserGroupChallenge from "./UserGroupChallenge.js";
import UserSetting from "./UserSetting.js";
import AssistantMemory from "./AssistantMemory.js";
import CalendarIntegration from "./CalendarIntegration.js";
import CalendarEvent from "./CalendarEvent.js";
import ChatMessage from "./ChatMessage.js";
import GroupChallengeMessage from "./GroupChallengeMessage.js";
import RegistrationVerification from "./RegistrationVerification.js";
import PasswordReset from "./PasswordReset.js";

// === Habit scheduling ===
User.hasMany(Habit, { foreignKey: "user_id", as: "habits" });
Habit.belongsTo(User, { foreignKey: "user_id", as: "owner" });
Habit.hasMany(Schedule, { foreignKey: "habit_id", as: "schedules" });
Schedule.belongsTo(Habit, { foreignKey: "habit_id", as: "habit" });

// Busy blocks are informational and only belong to a user
User.hasMany(BusySchedule, { foreignKey: "user_id", as: "busySchedules" });
BusySchedule.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// === Tasks ===
User.hasMany(Task, { foreignKey: "user_id", as: "tasks" });
Task.belongsTo(User, { foreignKey: "user_id", as: "owner" });

// === Habit progress tracking ===
Habit.hasMany(Progress, { foreignKey: "habit_id", as: "progressLogs" });
Progress.belongsTo(Habit, { foreignKey: "habit_id", as: "habit" });
User.hasMany(Progress, { foreignKey: "user_id", as: "progressLogs" });
Progress.belongsTo(User, { foreignKey: "user_id", as: "user" });

// === Achievements ===
User.belongsToMany(Achievement, {
  through: UserAchievement,
  foreignKey: "user_id",
  otherKey: "achievement_id",
  as: "achievements",
});
Achievement.belongsToMany(User, {
  through: UserAchievement,
  foreignKey: "achievement_id",
  otherKey: "user_id",
  as: "users",
});

// === Friends (self reference) ===
User.belongsToMany(User, {
  through: Friend,
  as: "friends",
  foreignKey: "user_id",
  otherKey: "friend_id",
});
Friend.belongsTo(User, { foreignKey: "user_id", as: "requester" });
Friend.belongsTo(User, { foreignKey: "friend_id", as: "recipient" });

// === Group challenges ===
User.belongsToMany(GroupChallenge, {
  through: UserGroupChallenge,
  foreignKey: "user_id",
  otherKey: "challenge_id",
  as: "groupChallenges",
});
GroupChallenge.belongsToMany(User, {
  through: UserGroupChallenge,
  foreignKey: "challenge_id",
  otherKey: "user_id",
  as: "participants",
});
GroupChallenge.belongsTo(User, { foreignKey: "creator_id", as: "creator" });
User.hasMany(GroupChallenge, { foreignKey: "creator_id", as: "createdChallenges" });
GroupChallenge.hasMany(GroupChallengeMessage, {
  foreignKey: "challenge_id",
  as: "messages",
});
GroupChallengeMessage.belongsTo(GroupChallenge, {
  foreignKey: "challenge_id",
  as: "challenge",
});
GroupChallengeMessage.belongsTo(User, { foreignKey: "sender_id", as: "sender" });

// === Notifications ===
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });
Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

// === User settings ===
User.hasOne(UserSetting, { foreignKey: "user_id", as: "settings" });
UserSetting.belongsTo(User, { foreignKey: "user_id", as: "user" });

// === Assistant memories ===
User.hasMany(AssistantMemory, {
  foreignKey: "user_id",
  as: "assistantMemories",
});
AssistantMemory.belongsTo(User, {
  foreignKey: "user_id",
  as: "owner",
});

// === Calendar sync ===
User.hasMany(CalendarIntegration, {
  foreignKey: "user_id",
  as: "calendarIntegrations",
});
CalendarIntegration.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

CalendarIntegration.hasMany(CalendarEvent, {
  foreignKey: "integration_id",
  as: "events",
});
CalendarEvent.belongsTo(CalendarIntegration, {
  foreignKey: "integration_id",
  as: "integration",
});

User.hasMany(CalendarEvent, {
  foreignKey: "user_id",
  as: "calendarEvents",
});
CalendarEvent.belongsTo(User, {
  foreignKey: "user_id",
  as: "owner",
});

// === Direct messaging ===
User.hasMany(ChatMessage, { foreignKey: "sender_id", as: "sentMessages" });
User.hasMany(ChatMessage, { foreignKey: "receiver_id", as: "receivedMessages" });
ChatMessage.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
ChatMessage.belongsTo(User, { foreignKey: "receiver_id", as: "recipient" });

export {
  User,
  Habit,
  Schedule,
  BusySchedule,
  Progress,
  Task,
  Notification,
  Achievement,
  UserAchievement,
  Friend,
  GroupChallenge,
  UserGroupChallenge,
  UserSetting,
  AssistantMemory,
  CalendarIntegration,
  CalendarEvent,
  ChatMessage,
  GroupChallengeMessage,
  RegistrationVerification,
  PasswordReset,
};
