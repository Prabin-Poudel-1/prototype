package com.pulse;

import static com.pulse.Models.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class Planner {
  public static final int START_MINUTE = 480;

  public void validate(Preferences p) {
    if (p == null) throw new IllegalArgumentException("Trip preferences are required.");
    try {
      LocalDate.parse(p.date());
    } catch (Exception e) {
      throw new IllegalArgumentException("Choose a valid travel date.");
    }
    if (p.days() < 1 || p.days() > 5)
      throw new IllegalArgumentException("Choose between 1 and 5 days.");
    int start;
    try {
      if (!p.startTime().matches("\\d{2}:\\d{2}")) throw new IllegalArgumentException();
      LocalTime t = LocalTime.parse(p.startTime());
      start = t.getHour() * 60 + t.getMinute();
    } catch (Exception e) {
      throw new IllegalArgumentException("Choose a valid starting time.");
    }
    if (start + p.hours() * 60 > 1440)
      throw new IllegalArgumentException(
          "Starting time plus available hours must finish within the same day.");
    if (p.people() < 1 || p.people() > 8)
      throw new IllegalArgumentException("Choose between 1 and 8 travellers.");
    if (p.budget() < 500 || p.budget() > 100000)
      throw new IllegalArgumentException("Day budget must be between NPR 500 and 100,000.");
    if (p.hours() < 2 || p.hours() > 10)
      throw new IllegalArgumentException("Choose between 2 and 10 hours.");
    if (!Set.of("bird", "nature", "culture").contains(Objects.toString(p.focus(), "")))
      throw new IllegalArgumentException("Choose a supported main interest.");
    if (!Set.of("optional", "include", "exclude").contains(Objects.toString(p.culture(), "")))
      throw new IllegalArgumentException("Choose a cultural activity preference.");
    if (p.focus().equals("culture") && p.culture().equals("exclude"))
      throw new IllegalArgumentException("Culture cannot be both the main interest and excluded.");
  }

  public Optional<Plan> plan(Preferences p, List<Activity> available, Set<String> preserve) {
    validate(p);
    List<Activity> eligible =
        available.stream()
            .filter(a -> !p.lowWalking() || a.lowWalking())
            .filter(a -> !p.culture().equals("exclude") || !a.kind().equals("culture"))
            .toList();
    Search search = new Search(p, eligible, preserve);
    search.visit(
        new ArrayList<>(),
        new HashSet<>(),
        startMinute(p),
        Catalog.START_LAT,
        Catalog.START_LNG,
        0,
        0,
        0);
    if (p.days() == 1) return Optional.ofNullable(search.best).map(day -> combine(p, List.of(day)));
    if (p.days() > eligible.size()) return Optional.empty();
    // Each state's key is its visited-place set; retain cost/score Pareto alternatives.
    Map<Set<String>, List<List<Plan>>> states = new HashMap<>();
    states.put(Set.of(), new ArrayList<>(List.of(List.of())));
    List<Plan> dayCandidates =
        search.candidatesByPlaces.values().stream().flatMap(List::stream).toList();
    for (int d = 0; d < p.days(); d++) {
      Map<Set<String>, List<List<Plan>>> next = new HashMap<>();
      for (var entry : states.entrySet())
        for (List<Plan> prefix : entry.getValue()) {
          for (Plan candidate : dayCandidates) {
            Set<String> ids =
                new HashSet<>(candidate.stops().stream().map(s -> s.activity().id()).toList());
            if (!Collections.disjoint(entry.getKey(), ids)) continue;
            int cost = cost(prefix) + candidate.totalCost();
            if (cost > p.budget()) continue;
            ids.addAll(entry.getKey());
            List<Plan> combined = new ArrayList<>(prefix);
            combined.add(candidate);
            var bucket = next.computeIfAbsent(Set.copyOf(ids), k -> new ArrayList<>());
            if (bucket.stream().anyMatch(old -> cost(old) <= cost && score(old) >= score(combined)))
              continue;
            bucket.removeIf(old -> cost(old) >= cost && score(old) <= score(combined));
            bucket.add(combined);
          }
        }
      states = next;
      if (states.isEmpty()) return Optional.empty();
    }
    return states.values().stream()
        .flatMap(List::stream)
        .filter(
            days ->
                days.stream()
                    .flatMap(d -> d.stops().stream())
                    .anyMatch(s -> s.activity().kind().equals(p.focus())))
        .filter(
            days ->
                !p.culture().equals("include")
                    || days.stream()
                        .flatMap(d -> d.stops().stream())
                        .anyMatch(s -> s.activity().kind().equals("culture")))
        .map(days -> combine(p, days))
        .max(Comparator.comparingInt(Plan::score).thenComparingInt(plan -> -plan.totalCost()));
  }

  static int startMinute(Preferences p) {
    LocalTime t = LocalTime.parse(p.startTime());
    return t.getHour() * 60 + t.getMinute();
  }

  static int cost(List<Plan> plans) {
    return plans.stream().mapToInt(Plan::totalCost).sum();
  }

  static int score(List<Plan> plans) {
    return plans.stream().mapToInt(Plan::score).sum();
  }

  static Plan combine(Preferences p, List<Plan> plans) {
    List<DayPlan> days = new ArrayList<>();
    for (int i = 0; i < plans.size(); i++)
      days.add(new DayPlan(i + 1, LocalDate.parse(p.date()).plusDays(i).toString(), plans.get(i)));
    return new Plan(
        plans.stream().flatMap(d -> d.stops().stream()).toList(),
        cost(plans),
        plans.stream().mapToInt(Plan::activityCost).sum(),
        plans.stream().mapToInt(Plan::transportCost).sum(),
        plans.stream().mapToInt(Plan::totalMinutes).sum(),
        plans.getLast().returnMinute(),
        score(plans),
        plans.getFirst().assumptions(),
        days);
  }

  public static double distance(double lat1, double lng1, double lat2, double lng2) {
    double a =
        Math.pow(Math.sin(Math.toRadians(lat2 - lat1) / 2), 2)
            + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.pow(Math.sin(Math.toRadians(lng2 - lng1) / 2), 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  public static int travel(double km) {
    return Math.max(8, (int) Math.ceil(km * 1.4 / 18 * 60));
  }

  private static int fare(double km) {
    return Math.max(80, (int) Math.ceil(km * 1.4 * 80 / 10) * 10);
  }

  private static class Search {
    final Preferences p;
    final List<Activity> candidates;
    final Set<String> preserve;
    Plan best;
    final Map<Set<String>, List<Plan>> candidatesByPlaces = new HashMap<>();

    Search(Preferences p, List<Activity> candidates, Set<String> preserve) {
      this.p = p;
      this.candidates = candidates;
      this.preserve = preserve;
    }

    void visit(
        List<Stop> stops,
        Set<String> used,
        int minute,
        double lat,
        double lng,
        int activityCost,
        int transport,
        int utility) {
      double home = distance(lat, lng, Catalog.START_LAT, Catalog.START_LNG);
      int end = minute + travel(home);
      int transportTotal = transport + fare(home);
      int total = activityCost + transportTotal;
      boolean focusMet = stops.stream().anyMatch(s -> s.activity().kind().equals(p.focus()));
      boolean cultureMet =
          !p.culture().equals("include")
              || stops.stream().anyMatch(s -> s.activity().kind().equals("culture"));
      if (!stops.isEmpty()
          && (p.days() > 1 || (focusMet && cultureMet))
          && end <= startMinute(p) + p.hours() * 60
          && total <= p.budget()) {
        int score = utility - (end - startMinute(p)) / 8 - total / 200;
        Plan candidate =
            new Plan(
                List.copyOf(stops),
                total,
                activityCost,
                transportTotal,
                end - startMinute(p),
                end,
                score,
                List.of(
                    "Demonstration only: activity prices, opening windows, low-walking labels and"
                        + " availability are sample data.",
                    "Each day starts at "
                        + p.startTime()
                        + " and returns to the sample Bharatpur base. Available hours apply per"
                        + " day; budget covers the whole group across all days. Flights and"
                        + " accommodation are excluded.",
                    "Travel estimates use straight-line distances × 1.4, an assumed 18 km/h and"
                        + " NPR 80/km. They are not road directions or live traffic.",
                    "Transport estimate assumes one vehicle for the group; actual capacity and"
                        + " fares require confirmation.",
                    "No live weather, wildlife sightings, operator bookings or AI service is"
                        + " connected."));
        if (best == null
            || score > best.score()
            || (score == best.score() && total < best.totalCost())) best = candidate;
        if (p.days() > 1) {
          var bucket = candidatesByPlaces.computeIfAbsent(Set.copyOf(used), k -> new ArrayList<>());
          if (bucket.stream().noneMatch(old -> old.totalCost() <= total && old.score() >= score)) {
            bucket.removeIf(old -> old.totalCost() >= total && old.score() <= score);
            bucket.add(candidate);
          }
        }
      }
      if (stops.size() == 3) return;
      for (Activity a : candidates) {
        if (used.contains(a.id())) continue;
        double km = distance(lat, lng, a.lat(), a.lng());
        int travel = travel(km);
        int arrival = Math.max(minute + travel, a.openMinute());
        int departure = arrival + a.duration();
        int cost = activityCost + a.pricePerPerson() * p.people();
        int nextTransport = transport + fare(km);
        if (departure > a.closeMinute()
            || departure > startMinute(p) + p.hours() * 60
            || cost + nextTransport > p.budget()) continue;
        int value = (a.kind().equals(p.focus()) ? 110 : 35) + (preserve.contains(a.id()) ? 90 : 0);
        used.add(a.id());
        stops.add(new Stop(a, arrival, departure, travel, a.pricePerPerson() * p.people()));
        visit(stops, used, departure, a.lat(), a.lng(), cost, nextTransport, utility + value);
        stops.remove(stops.size() - 1);
        used.remove(a.id());
      }
    }
  }
}
