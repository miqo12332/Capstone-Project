import express from "express";
import { Op } from "sequelize";
import CalendarIntegration from "../models/CalendarIntegration.js";
import CalendarEvent from "../models/CalendarEvent.js";
import Schedule from "../models/Schedule.js";
import Habit from "../models/Habit.js";
import { parseIcsFeed } from "../utils/calendarParser.js";

const router = express.Router();

const buildOverview = async (userId, rangeDays = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsedRange = Number.parseInt(rangeDays, 10);
  const windowDays = Number.isNaN(parsedRange) ? 30 : Math.max(parsedRange, 1);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + windowDays);

  const [integrations, events, schedules] = await Promise.all([
    CalendarIntegration.findAll({
      where: { user_id: userId },
      order: [["updated_at", "DESC"]],
    }),
    CalendarEvent.findAll({
      where: {
        user_id: userId,
        start_time: {
          [Op.between]: [today, horizon],
        },
      },
      order: [
        ["start_time", "ASC"],
        ["id", "ASC"],
      ],
    }),
    Schedule.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Habit,
          as: "habit",
          attributes: ["id", "title"],
          required: false,
        },
      ],
    }),
  ]);

  const plainIntegrations = integrations.map((integration) =>
    integration.get({ plain: true })
  );

  const plainEvents = events.map((event) => {
    const plain = event.get({ plain: true });
    return {
      ...plain,
      start_time: plain.start_time
        ? new Date(plain.start_time).toISOString()
        : null,
      end_time: plain.end_time ? new Date(plain.end_time).toISOString() : null,
    };
  });

  const plainSchedules = schedules.map((schedule) =>
    schedule.get({ plain: true })
  );

  const groupedByDate = plainEvents.reduce((acc, event) => {
    const key = event.start_time ? event.start_time.split("T")[0] : null;
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const busyDays = Object.entries(groupedByDate)
    .map(([date, items]) => ({
      date,
      count: items.length,
      label: new Date(date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalMinutes = plainEvents.reduce((sum, event) => {
    const start = event.start_time ? new Date(event.start_time) : null;
    const end = event.end_time ? new Date(event.end_time) : null;
    if (!start || Number.isNaN(start.getTime())) return sum;
    if (!end || Number.isNaN(end.getTime())) return sum;
    const diff = Math.max(0, (end.getTime() - start.getTime()) / 60000);
    return sum + diff;
  }, 0);

  const providers = plainIntegrations.reduce((acc, integration) => {
    if (!integration.provider) return acc;
    acc[integration.provider] = (acc[integration.provider] || 0) + 1;
    return acc;
  }, {});

  const lastSyncTs = plainIntegrations.reduce((latest, integration) => {
    if (!integration.last_synced_at) return latest;
    const ts = new Date(integration.last_synced_at).getTime();
    return Number.isNaN(ts) || ts < latest ? latest : ts;
  }, 0);

  const nextFreeDay = (() => {
    const cursor = new Date(today);
    for (let i = 0; i < windowDays; i += 1) {
      const key = cursor.toISOString().split("T")[0];
      if (!groupedByDate[key]) {
        return key;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return null;
  })();

  return {
    integrations: plainIntegrations,
    events: plainEvents,
    schedules: plainSchedules,
    groupedByDate,
    summary: {
      totalEvents: plainEvents.length,
      integrationCount: plainIntegrations.length,
      providers,
      busyDays,
      hoursScheduled: Math.round((totalMinutes / 60) * 10) / 10,
      lastSync: lastSyncTs ? new Date(lastSyncTs).toISOString() : null,
      nextFreeDay,
      upcoming: plainEvents.slice(0, 6),
    },
  };
};

router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    const overview = await buildOverview(userId, days);
    res.json(overview);
  } catch (err) {
    console.error("❌ Calendar overview error", err);
    res.status(500).json({ error: "Failed to load calendar overview" });
  }
});

router.post("/user/:userId/sync", async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      provider,
      label,
      sourceUrl,
      icsText,
      events,
      integrationId,
      days = 30,
    } = req.body;

    if (!provider && !integrationId) {
      return res
        .status(400)
        .json({ error: "provider or integrationId is required" });
    }

    let integration = null;
    if (integrationId) {
      integration = await CalendarIntegration.findOne({
        where: { id: integrationId, user_id: userId },
      });
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
    }

    const resolvedProvider = provider || integration?.provider;
    const resolvedLabel = label || integration?.label || `${resolvedProvider} calendar`;
    let resolvedSourceUrl = sourceUrl || integration?.source_url || null;
    let feedText = icsText || null;

    if (!feedText && resolvedSourceUrl) {
      try {
        const response = await fetch(resolvedSourceUrl);
        if (!response.ok) {
          throw new Error(`Unable to download calendar from ${resolvedSourceUrl}`);
        }
        feedText = await response.text();
      } catch (downloadErr) {
        console.warn("⚠️ Calendar download failed", downloadErr.message);
        if (!Array.isArray(events) || events.length === 0) {
          return res.status(400).json({
            error: "Unable to download calendar feed",
            detail: downloadErr.message,
          });
        }
      }
    }

    let parsedEvents = Array.isArray(events) ? events : [];
    if (feedText) {
      parsedEvents = parseIcsFeed(feedText);
      resolvedSourceUrl = sourceUrl || resolvedSourceUrl;
    }

    if (!parsedEvents || parsedEvents.length === 0) {
      return res
        .status(400)
        .json({ error: "No events were detected in the provided calendar" });
    }

    const now = new Date();
    if (integration) {
      await integration.update({
        label: resolvedLabel,
        source_type: feedText ? (resolvedSourceUrl ? "url" : "upload") : "manual",
        source_url: resolvedSourceUrl,
        metadata: {
          ...(integration.metadata || {}),
          importedEvents: parsedEvents.length,
        },
        last_synced_at: now,
        updated_at: now,
      });
    } else {
      integration = await CalendarIntegration.create({
        user_id: userId,
        provider: resolvedProvider,
        label: resolvedLabel,
        source_type: feedText ? (resolvedSourceUrl ? "url" : "upload") : "manual",
        source_url: resolvedSourceUrl,
        external_id: null,
        metadata: { importedEvents: parsedEvents.length },
        last_synced_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    await CalendarEvent.destroy({ where: { integration_id: integration.id } });

    const rows = parsedEvents.map((event) => {
      const start = event.start instanceof Date ? event.start : new Date(event.start);
      let end = event.end instanceof Date ? event.end : event.end ? new Date(event.end) : null;
      if (end && end < start) {
        end = new Date(start);
      }

      return {
        user_id: Number(userId),
        integration_id: integration.id,
        title: event.title || "Calendar Event",
        description: event.description || null,
        location: event.location || null,
        start_time: start,
        end_time: end,
        timezone: event.timezone || null,
        all_day: Boolean(event.allDay),
        source: resolvedProvider,
        external_event_id: event.uid || null,
        metadata: {
          url: event.url || null,
          categories: event.categories || [],
        },
        created_at: now,
        updated_at: now,
      };
    });

    if (rows.length > 0) {
      await CalendarEvent.bulkCreate(rows);
    }

    const overview = await buildOverview(userId, days);
    res.json({
      message: "Calendar synced",
      integration: integration.get({ plain: true }),
      overview,
    });
  } catch (err) {
    console.error("❌ Calendar sync error", err);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

router.delete("/integrations/:integrationId", async (req, res) => {
  try {
    const { integrationId } = req.params;
    const { userId } = req.query;
    const integration = await CalendarIntegration.findByPk(integrationId);
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    if (userId && Number(userId) !== integration.user_id) {
      return res.status(403).json({ error: "You cannot remove this integration" });
    }

    await CalendarEvent.destroy({ where: { integration_id: integration.id } });
    await integration.destroy();

    res.json({ message: "Integration removed" });
  } catch (err) {
    console.error("❌ Calendar disconnect error", err);
    res.status(500).json({ error: "Failed to remove integration" });
  }
});

export default router;
