import User from "./User.js";
import Habit from "./Habit.js";
import Schedule from "./Schedule.js";
import Progress from "../../models/Progress.js";
import Notification from "../../models/Notification.js";
import Achievement from "../../models/Achievement.js";
import UserAchievement from "../../models/UserAchievement.js";
import Friend from "../../models/Friend.js";
import GroupChallenge from "../../models/GroupChallenge.js";
import UserGroupChallenge from "../../models/UserGroupChallenge.js";
import UserSetting from "../../models/UserSetting.js";
import AssistantMemory from "../../models/AssistantMemory.js";
import CalendarIntegration from "../../models/CalendarIntegration.js";
import CalendarEvent from "../../models/CalendarEvent.js";
import ChatMessage from "../../models/ChatMessage.js";

// === Habit scheduling ===
User.hasMany(Habit, { foreignKey: "user_id", as: "habits" });
Habit.belongsTo(User, { foreignKey: "user_id", as: "owner" });
Habit.hasMany(Schedule, { foreignKey: "habit_id", as: "schedules" });
Schedule.belongsTo(Habit, { foreignKey: "habit_id", as: "habit" });
User.hasMany(Schedule, { foreignKey: "userid", as: "schedules" });
Schedule.belongsTo(User, { foreignKey: "userid", as: "user" });

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
  Progress,
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
};
