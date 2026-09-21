package com.pulse;

import static com.pulse.Models.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;

class PlannerTest {
  final Planner planner = new Planner();
  final Catalog catalog = new Catalog();

  Preferences prefs(int people, int budget, int hours, String culture, boolean walking) {
    return new Preferences("2026-10-10", people, budget, hours, "bird", culture, walking);
  }

  @Test
  void multipleDaysRespectDatesStartTimeUniqueStopsAndWholeTripBudget() {
    Preferences p =
        new Preferences("2026-12-31", 2, 18000, 6, "bird", "include", false, 3, "09:30");
    Plan result = planner.plan(p, catalog.all(), Set.of()).orElseThrow();
    assertEquals(3, result.days().size());
    assertEquals("2027-01-02", result.days().getLast().date());
    assertTrue(result.totalCost() <= p.budget());
    assertEquals(
        result.totalCost(), result.days().stream().mapToInt(d -> d.plan().totalCost()).sum());
    assertEquals(
        result.totalMinutes(), result.days().stream().mapToInt(d -> d.plan().totalMinutes()).sum());
    assertEquals(
        result.stops().size(),
        result.stops().stream().map(s -> s.activity().id()).distinct().count());
    assertTrue(result.stops().stream().anyMatch(s -> s.activity().kind().equals("culture")));
    assertTrue(result.stops().stream().anyMatch(s -> s.activity().kind().equals("bird")));
    for (DayPlan day : result.days()) {
      assertFalse(day.plan().stops().isEmpty());
      assertTrue(day.plan().stops().size() <= 3);
      assertTrue(day.plan().returnMinute() <= 570 + 360);
      assertTrue(day.plan().stops().getFirst().arrival() >= 570);
      assertEquals(day.plan().returnMinute() - 570, day.plan().totalMinutes());
    }
  }

  @Test
  void lateStartsAndInvalidDayCountsAreHandled() {
    Preferences late =
        new Preferences("2026-10-10", 2, 6500, 2, "bird", "optional", false, 1, "20:00");
    assertTrue(planner.plan(late, catalog.all(), Set.of()).isEmpty());
    for (String time : List.of("25:00", "9:00", "bad", "23:30"))
      assertThrows(
          IllegalArgumentException.class,
          () ->
              planner.validate(
                  new Preferences("2026-10-10", 2, 6500, 2, "bird", "optional", false, 1, time)));
    for (int days : new int[] {0, 6})
      assertThrows(
          IllegalArgumentException.class,
          () ->
              planner.validate(
                  new Preferences(
                      "2026-10-10", 2, 6500, 6, "bird", "optional", false, days, "08:00")));
    assertTrue(
        planner
            .plan(
                new Preferences("2026-10-10", 8, 500, 6, "bird", "optional", false, 3, "08:00"),
                catalog.all(),
                Set.of())
            .isEmpty());
  }

  @Test
  void fiveDaySearchFinishesWithinPracticalTime() {
    assertTimeout(
        java.time.Duration.ofSeconds(10),
        () -> {
          Plan result =
              planner
                  .plan(
                      new Preferences(
                          "2026-10-10", 2, 20000, 8, "nature", "optional", false, 5, "08:00"),
                      catalog.all(),
                      Set.of())
                  .orElseThrow();
          assertEquals(5, result.days().size());
        });
  }

  @Test
  void expandedDestinationsAreReachableAndRespectWalkingPreference() {
    for (String id : List.of("devghat", "maulakalika", "meghauli", "sauraha-riverfront")) {
      Activity activity = catalog.get(id);
      Preferences p =
          new Preferences("2026-10-10", 2, 20000, 10, activity.kind(), "optional", false);
      Plan result = planner.plan(p, List.of(activity), Set.of()).orElseThrow();
      assertEquals(id, result.stops().getFirst().activity().id());
      assertTrue(result.totalCost() <= p.budget());
      assertTrue(result.totalMinutes() <= p.hours() * 60);
      Preferences light =
          new Preferences(
              p.date(), p.people(), p.budget(), p.hours(), p.focus(), p.culture(), true);
      assertTrue(planner.plan(light, List.of(activity), Set.of()).isEmpty());
    }
  }

  @Test
  void plansRespectConstraintsAcrossBudgetsGroupsAndTimeLimits() {
    int feasible = 0;
    for (int group = 1; group <= 8; group++)
      for (int budget : new int[] {500, 2000, 4500, 8000, 15000})
        for (int hours : new int[] {2, 4, 6, 10}) {
          Preferences p = prefs(group, budget, hours, "exclude", true);
          var result = planner.plan(p, catalog.all(), Set.of());
          if (result.isEmpty()) continue;
          feasible++;
          Plan plan = result.get();
          assertTrue(plan.totalCost() <= budget);
          assertTrue(plan.totalMinutes() <= hours * 60);
          assertEquals(plan.totalCost(), plan.activityCost() + plan.transportCost());
          assertTrue(plan.stops().stream().anyMatch(s -> s.activity().kind().equals("bird")));
          assertTrue(
              plan.stops().stream()
                  .allMatch(
                      s -> s.activity().lowWalking() && !s.activity().kind().equals("culture")));
          assertEquals(
              plan.stops().size(),
              plan.stops().stream().map(s -> s.activity().id()).distinct().count());
          int last = 480;
          for (Stop stop : plan.stops()) {
            assertTrue(stop.arrival() >= last + stop.travelMinutes());
            assertTrue(stop.arrival() >= stop.activity().openMinute());
            assertTrue(stop.departure() <= stop.activity().closeMinute());
            assertEquals(stop.activityCost(), group * stop.activity().pricePerPerson());
            last = stop.departure();
          }
          assertTrue(plan.returnMinute() > last);
        }
    assertTrue(feasible > 30);
  }

  @Test
  void impossibleBudgetDoesNotInventAPlan() {
    assertTrue(
        planner.plan(prefs(8, 500, 2, "optional", false), catalog.all(), Set.of()).isEmpty());
  }

  @Test
  void mandatoryCultureIsIncluded() {
    Plan plan =
        planner.plan(prefs(2, 12000, 8, "include", false), catalog.all(), Set.of()).orElseThrow();
    assertTrue(plan.stops().stream().anyMatch(s -> s.activity().kind().equals("culture")));
  }

  @Test
  void unavailableBirdActivitiesCannotBeReplacedWithUnrelatedInterests() {
    assertTrue(
        planner
            .plan(
                prefs(2, 15000, 8, "optional", false),
                catalog.all().stream().filter(a -> !a.kind().equals("bird")).toList(),
                Set.of())
            .isEmpty());
  }

  @Test
  void repairRemovesCancelledActivityAndRetainsFocus() {
    Preferences p = prefs(2, 6500, 6, "optional", false);
    Plan first = planner.plan(p, catalog.all(), Set.of()).orElseThrow();
    String cancelled = first.stops().getFirst().activity().id();
    Set<String> preserve =
        new HashSet<>(first.stops().stream().map(s -> s.activity().id()).toList());
    Plan next =
        planner
            .plan(
                p, catalog.all().stream().filter(a -> !a.id().equals(cancelled)).toList(), preserve)
            .orElseThrow();
    assertTrue(next.stops().stream().noneMatch(s -> s.activity().id().equals(cancelled)));
    assertTrue(next.stops().stream().anyMatch(s -> s.activity().kind().equals("bird")));
  }

  @Test
  void conflictingAndMalformedPreferencesAreRejected() {
    assertThrows(
        IllegalArgumentException.class,
        () -> planner.validate(new Preferences("bad", 2, 5000, 6, "bird", "optional", false)));
    assertThrows(
        IllegalArgumentException.class,
        () ->
            planner.validate(
                new Preferences("2026-10-10", 2, 5000, 6, "culture", "exclude", false)));
  }
}
