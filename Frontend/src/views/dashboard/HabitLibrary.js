import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CBadge,
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CListGroup,
  CListGroupItem,
  CProgress,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import {
  cilArrowRight,
  cilCheckCircle,
  cilClock,
  cilFilter,
  cilLibrary,
  cilLightbulb,
  cilList,
  cilStar,
} from "@coreui/icons";

import { AuthContext } from "../../context/AuthContext";
import {
  addHabitFromLibrary,
  getLibrary,
  getLibraryHighlights,
  getLibraryRecommendations,
  getLibraryWindows,
} from "../../services/library";
import { emitDataRefresh, REFRESH_SCOPES } from "../../utils/refreshBus";

const HabitLibrary = () => {
  const { user } = useContext(AuthContext);
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    difficulty: "",
    timeframe: "",
    pillar: "",
  });
  const [libraryData, setLibraryData] = useState({
    habits: [],
    summary: { total: 0, averageDuration: 0, commonTimeframes: [], leadingCategory: null },
    facets: { categories: [], difficulties: [], timeframes: [], pillars: [] },
  });
  const [highlights, setHighlights] = useState({ trending: [], wellnessAnchors: [] });
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationContext, setRecommendationContext] = useState(null);
  const [upcomingWindows, setUpcomingWindows] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [addingId, setAddingId] = useState(null);
  const [activeQuickCategory, setActiveQuickCategory] = useState("all");

  useEffect(() => {
    if (!feedback) return undefined;
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    let ignore = false;
    const loadLibrary = async () => {
      setLoadingLibrary(true);
      try {
        const data = await getLibrary(filters);
        if (!ignore) {
          setLibraryData({
            habits: data.habits || [],
            summary: data.summary || {
              total: 0,
              averageDuration: 0,
              commonTimeframes: [],
              leadingCategory: null,
            },
            facets: data.facets || {
              categories: [],
              difficulties: [],
              timeframes: [],
              pillars: [],
            },
          });
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load library", error);
          setFeedback({
            type: "danger",
            message: "We couldn't load the habit library. Please try again in a moment.",
          });
        }
      } finally {
        if (!ignore) {
          setLoadingLibrary(false);
        }
      }
    };

    loadLibrary();
    return () => {
      ignore = true;
    };
  }, [filters]);

  useEffect(() => {
    let ignore = false;
    const loadInsights = async () => {
      setLoadingInsights(true);
      try {
        const [highlightData, recommendationData, windowData] = await Promise.all([
          getLibraryHighlights(),
          getLibraryRecommendations(user?.id),
          getLibraryWindows(user?.id),
        ]);

        if (ignore) return;
        setHighlights({
          trending: highlightData.trending || [],
          wellnessAnchors: highlightData.wellnessAnchors || [],
        });
        setRecommendations(recommendationData.suggestions || []);
        setRecommendationContext(recommendationData.context || null);
        setUpcomingWindows(windowData.windows || []);
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load library insights", error);
          setFeedback({
            type: "warning",
            message: "Habit insights are temporarily unavailable, but you can keep browsing the library.",
          });
        }
      } finally {
        if (!ignore) {
          setLoadingInsights(false);
        }
      }
    };

    loadInsights();
    return () => {
      ignore = true;
    };
  }, [user?.id]);

  const resetFilters = () => {
    setFilters({ q: "", category: "", difficulty: "", timeframe: "", pillar: "" });
    setActiveQuickCategory("all");
  };

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [field]: value }));
    if (field === "category") {
      setActiveQuickCategory(value || "all");
    }
  };

  const handleQuickCategory = (category) => {
    setActiveQuickCategory(category);
    setFilters((prev) => ({
      ...prev,
      category: category === "all" ? "" : category,
    }));
  };

  const handleAddHabit = async (habit) => {
    if (!user?.id) {
      setFeedback({ type: "danger", message: "You need to be logged in to add habits." });
      return;
    }

    try {
      setAddingId(habit.id);
      const created = await addHabitFromLibrary(user.id, habit);
      setFeedback({
        type: "success",
        message: `\u2705 ${habit.name || habit.title} was added to your habit list.`,
      });
      emitDataRefresh(REFRESH_SCOPES.HABITS, {
        reason: "habit-added-from-library",
        habitId: created?.id,
      });
    } catch (error) {
      console.error("Failed to add habit", error);
      setFeedback({ type: "danger", message: "We couldn't add that habit yet. Please try again." });
    } finally {
      setAddingId(null);
    }
  };

  const quickFilters = useMemo(() => {
    const categories = libraryData.facets.categories || [];
    return ["all", ...categories.slice(0, 4)];
  }, [libraryData.facets.categories]);

  const highlightedSummary = libraryData.summary || {
    total: 0,
    averageDuration: 0,
    commonTimeframes: [],
    leadingCategory: null,
  };

  const hasHabits = libraryData.habits && libraryData.habits.length > 0;

  return (
    <CRow className="g-4">
      <CCol xl={8}>
        <CCard className="shadow-sm h-100">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h4 className="mb-0">Habit Library</h4>
              <small className="text-medium-emphasis">
                Explore curated routines and add them to your plan with one click.
              </small>
            </div>
            <CButton color="secondary" variant="ghost" size="sm" onClick={resetFilters}>
              <CIcon icon={cilFilter} className="me-2" /> Reset
            </CButton>
          </CCardHeader>
          <CCardBody>
            {feedback && (
              <CAlert color={feedback.type} className="mb-4" dismissible>
                {feedback.message}
              </CAlert>
            )}

            <CRow className="g-3 align-items-end mb-4">
              <CCol md={5}>
                <CFormLabel htmlFor="library-search">Search</CFormLabel>
                <CFormInput
                  id="library-search"
                  placeholder="Search by focus, e.g. sleep, focus, hydration"
                  value={filters.q}
                  onChange={handleFilterChange("q")}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="library-category">Category</CFormLabel>
                <CFormSelect
                  id="library-category"
                  value={filters.category}
                  onChange={handleFilterChange("category")}
                >
                  <option value="">All categories</option>
                  {libraryData.facets.categories?.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel htmlFor="library-difficulty">Difficulty</CFormLabel>
                <CFormSelect
                  id="library-difficulty"
                  value={filters.difficulty}
                  onChange={handleFilterChange("difficulty")}
                >
                  <option value="">All</option>
                  {libraryData.facets.difficulties?.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel htmlFor="library-timeframe">Time of day</CFormLabel>
                <CFormSelect
                  id="library-timeframe"
                  value={filters.timeframe}
                  onChange={handleFilterChange("timeframe")}
                >
                  <option value="">Any</option>
                  {libraryData.facets.timeframes?.map((timeframe) => (
                    <option key={timeframe} value={timeframe}>
                      {timeframe}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>

            {quickFilters.length > 1 && (
              <div className="mb-4">
                <small className="text-medium-emphasis d-block mb-2">Quick focus areas</small>
                <CButtonGroup role="group">
                  {quickFilters.map((category) => (
                    <CButton
                      key={category}
                      color={activeQuickCategory === category ? "primary" : "secondary"}
                      variant={activeQuickCategory === category ? undefined : "outline"}
                      size="sm"
                      onClick={() => handleQuickCategory(category)}
                    >
                      {category === "all" ? "Show all" : category}
                    </CButton>
                  ))}
                </CButtonGroup>
              </div>
            )}

            <CRow className="g-3 mb-4">
              <CCol md={4}>
                <CCard className="border-0 bg-body-tertiary h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-3">
                      <CIcon icon={cilLibrary} className="text-primary me-2" />
                      <span className="text-medium-emphasis">Available habits</span>
                    </div>
                    <h3 className="mb-0">{highlightedSummary.total}</h3>
                    <p className="mb-0 text-medium-emphasis">curated routines ready to add</p>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard className="border-0 bg-body-tertiary h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-3">
                      <CIcon icon={cilClock} className="text-warning me-2" />
                      <span className="text-medium-emphasis">Average duration</span>
                    </div>
                    <h3 className="mb-0">{highlightedSummary.averageDuration} min</h3>
                    <p className="mb-0 text-medium-emphasis">
                      most plans fit easily between meetings
                    </p>
                  </CCardBody>
                </CCard>
              </CCol>
              <CCol md={4}>
                <CCard className="border-0 bg-body-tertiary h-100">
                  <CCardBody>
                    <div className="d-flex align-items-center mb-3">
                      <CIcon icon={cilStar} className="text-success me-2" />
                      <span className="text-medium-emphasis">Popular focus</span>
                    </div>
                    <h3 className="mb-0">
                      {highlightedSummary.leadingCategory || "Balanced"}
                    </h3>
                    <p className="mb-0 text-medium-emphasis">
                      {highlightedSummary.commonTimeframes?.length
                        ? `Most users stack these in the ${highlightedSummary.commonTimeframes.join(" & ")}`
                        : "Try scheduling at your peak energy time"}
                    </p>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>

            {loadingLibrary && (
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            )}

            {!loadingLibrary && !hasHabits && (
              <div className="text-center py-5 text-medium-emphasis">
                <CIcon icon={cilLightbulb} size="xl" className="mb-3 text-warning" />
                <p className="mb-1">No habits match your filters just yet.</p>
                <small>Try adjusting the filters or exploring another category.</small>
              </div>
            )}

            {!loadingLibrary && hasHabits && (
              <CAccordion alwaysOpen>
                {libraryData.habits.map((habit, index) => (
                  <CAccordionItem itemKey={habit.id} key={habit.id}>
                    <CAccordionHeader>
                      <div className="d-flex flex-column flex-md-row w-100 justify-content-between align-items-start align-items-md-center">
                        <div>
                          <strong>{habit.name}</strong>
                          <div className="text-medium-emphasis small">
                            {habit.category} • {habit.duration} min • {habit.difficulty}
                          </div>
                        </div>
                        <div className="mt-2 mt-md-0">
                          <CBadge color="primary" className="me-2">
                            {habit.timeframe}
                          </CBadge>
                          <CBadge color="info" className="text-white">
                            {habit.frequency}
                          </CBadge>
                        </div>
                      </div>
                    </CAccordionHeader>
                    <CAccordionBody>
                      <CRow className="g-3 align-items-start">
                        <CCol md={8}>
                          <p className="mb-3">{habit.description}</p>
                          <CListGroup className="mb-3" flush>
                            {habit.benefits?.map((benefit) => (
                              <CListGroupItem key={benefit} className="border-0 ps-0">
                                <CIcon icon={cilCheckCircle} className="text-success me-2" />
                                {benefit}
                              </CListGroupItem>
                            ))}
                          </CListGroup>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {habit.tags?.map((tag) => (
                              <CBadge color="secondary" key={tag}>
                                #{tag}
                              </CBadge>
                            ))}
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-3">
                            <div className="flex-grow-1">
                              <small className="text-medium-emphasis d-block">Adoption</small>
                              <CProgress
                                thin
                                color="primary"
                                value={habit.metrics?.adoptionRate || 0}
                                className="mb-0"
                              />
                            </div>
                            <div>
                              <span className="fw-semibold">{habit.metrics?.adoptionRate || 0}%</span>
                              <small className="text-medium-emphasis d-block">of users keep this</small>
                            </div>
                          </div>
                        </CCol>
                        <CCol md={4}>
                          <CCard className="bg-body-tertiary border-0">
                            <CCardBody>
                              <p className="text-medium-emphasis mb-2">Suggested schedule</p>
                              <div className="d-flex align-items-center mb-2">
                                <CIcon icon={cilClock} className="text-primary me-2" />
                                <div>
                                  <div className="fw-semibold">
                                    {habit.sampleSchedule?.start} - {habit.sampleSchedule?.end}
                                  </div>
                                  <small className="text-medium-emphasis">
                                    {habit.sampleSchedule?.days}
                                  </small>
                                </div>
                              </div>
                              <p className="small text-medium-emphasis mb-3">{habit.insight}</p>
                              <CButton
                                color="success"
                                className="w-100"
                                disabled={addingId === habit.id}
                                onClick={() => handleAddHabit(habit)}
                              >
                                {addingId === habit.id ? (
                                  <>
                                    <CSpinner size="sm" className="me-2" /> Adding...
                                  </>
                                ) : (
                                  <>
                                    <CIcon icon={cilList} className="me-2" /> Add to My Habits
                                  </>
                                )}
                              </CButton>
                            </CCardBody>
                          </CCard>
                        </CCol>
                      </CRow>
                    </CAccordionBody>
                  </CAccordionItem>
                ))}
              </CAccordion>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CCol xl={4}>
        <CRow className="g-4">
          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilLightbulb} className="text-warning me-2" />
                  Spotlight trends
                </div>
              </CCardHeader>
              <CCardBody>
                {loadingInsights ? (
                  <div className="text-center py-3">
                    <CSpinner size="sm" color="primary" />
                  </div>
                ) : (
                  <>
                    <p className="text-medium-emphasis small mb-3">
                      See what other Steppers are adopting right now.
                    </p>
                    <CListGroup flush className="mb-3">
                      {highlights.trending.map((trend) => (
                        <CListGroupItem key={trend.id} className="border-0 px-0">
                          <div className="d-flex justify-content-between">
                            <div>
                              <strong>{trend.name}</strong>
                              <div className="text-medium-emphasis small">{trend.category}</div>
                            </div>
                            <CBadge color="warning" textColor="dark">
                              {trend.metric}
                            </CBadge>
                          </div>
                          <small className="text-medium-emphasis d-block mt-2">
                            {trend.insight}
                          </small>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                    <p className="text-medium-emphasis small mb-2">Recovery anchors</p>
                    <CListGroup flush>
                      {highlights.wellnessAnchors.map((anchor) => (
                        <CListGroupItem key={anchor.id} className="border-0 px-0">
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{anchor.name}</span>
                            <CBadge color="success">{anchor.completion}% completion</CBadge>
                          </div>
                          <small className="text-medium-emphasis">
                            {anchor.duration} min commitment
                          </small>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilArrowRight} className="text-primary me-2" />
                  Suggested for you
                </div>
              </CCardHeader>
              <CCardBody>
                {loadingInsights ? (
                  <div className="text-center py-3">
                    <CSpinner size="sm" color="primary" />
                  </div>
                ) : (
                  <>
                    {recommendationContext && (
                      <div className="mb-3">
                        <small className="text-medium-emphasis d-block mb-2">Why these habits?</small>
                        <div className="d-flex flex-column gap-1">
                          <span>
                            You currently track {recommendationContext.ownedHabitCount || 0} habits.
                          </span>
                          {typeof recommendationContext.completionRate === "number" && (
                            <span>
                              Recent completion rate: {recommendationContext.completionRate}%
                            </span>
                          )}
                          {recommendationContext.nextFocusCategory && (
                            <span>
                              Next focus opportunity: {recommendationContext.nextFocusCategory}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {recommendations.length === 0 && (
                      <p className="text-medium-emphasis mb-0">
                        You're already exploring everything we suggest. Great job!
                      </p>
                    )}

                    {recommendations.map((suggestion) => (
                      <CCard key={suggestion.id} className="border-0 bg-body-tertiary mb-3">
                        <CCardBody>
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <strong>{suggestion.name}</strong>
                              <div className="text-medium-emphasis small">
                                {suggestion.category} • {suggestion.duration} min
                              </div>
                            </div>
                            <CBadge color="primary" shape="rounded-pill">
                              {suggestion.metrics?.adoptionRate}% adopt
                            </CBadge>
                          </div>
                          <p className="text-medium-emphasis small mb-3">{suggestion.reason}</p>
                          <CButton
                            color="primary"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddHabit(suggestion)}
                            disabled={addingId === suggestion.id}
                          >
                            {addingId === suggestion.id ? (
                              <>
                                <CSpinner size="sm" className="me-2" /> Adding
                              </>
                            ) : (
                              <>Add from library</>
                            )}
                          </CButton>
                        </CCardBody>
                      </CCard>
                    ))}
                  </>
                )}
              </CCardBody>
            </CCard>
          </CCol>

          <CCol xs={12}>
            <CCard className="shadow-sm h-100">
              <CCardHeader>
                <div className="d-flex align-items-center">
                  <CIcon icon={cilClock} className="text-info me-2" />
                  Upcoming schedule windows
                </div>
              </CCardHeader>
              <CCardBody>
                {loadingInsights ? (
                  <div className="text-center py-3">
                    <CSpinner size="sm" color="primary" />
                  </div>
                ) : upcomingWindows.length ? (
                  <CListGroup flush>
                    {upcomingWindows.map((window) => (
                      <CListGroupItem key={window.id} className="border-0 px-0">
                        <div className="d-flex justify-content-between">
                          <div>
                            <strong>{window.habitTitle}</strong>
                            <div className="text-medium-emphasis small">
                              {new Date(window.window).toLocaleString()} • {window.repeat}
                            </div>
                          </div>
                          {window.customdays && (
                            <CBadge color="secondary">{window.customdays}</CBadge>
                          )}
                        </div>
                      </CListGroupItem>
                    ))}
                  </CListGroup>
                ) : (
                  <p className="text-medium-emphasis mb-0">
                    Add a few library habits to unlock tailored scheduling suggestions.
                  </p>
                )}
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CCol>
    </CRow>
  );
};

export default HabitLibrary;
