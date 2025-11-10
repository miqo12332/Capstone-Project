// /models/index.js
// Centralises model imports and associations so every module works with the same
// relationships.  This file is imported by the server on startup which ensures
// all associations are registered exactly once.

import User from "./User.js";
import Habit from "./Habit.js";
import Schedule from "./Schedule.js";
import Progress from "./Progress.js";
import Notification from "./Notification.js";
import Achievement from "./Achievement.js";
import UserAchievement from "./UserAchievement.js";
import Friend from "./Friend.js";
import GroupChallenge from "./GroupChallenge.js";
import UserGroupChallenge from "./UserGroupChallenge.js";

// === Habit scheduling ===
User.hasMany(Habit, { foreignKey: "user_id", as: "habits" });
Habit.belongsTo(User, { foreignKey: "user_id", as: "owner" });
Habit.hasMany(Schedule, { foreignKey: "habit_id", as: "schedules" });
Schedule.belongsTo(Habit, { foreignKey: "habit_id", as: "habit" });

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
};
