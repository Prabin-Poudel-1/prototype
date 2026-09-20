package com.pulse;

import static com.pulse.Models.*;

import java.time.LocalDate;
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
        START_MINUTE,
        Catalog.START_LAT,
        Catalog.START_LNG,
        0,
        0,
        0);
    return Optional.ofNullable(search.best);
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
      if (focusMet && cultureMet && end <= START_MINUTE + p.hours() * 60 && total <= p.budget()) {
        int score = utility - (end - START_MINUTE) / 8 - total / 200;
        if (best == null
            || score > best.score()
            || (score == best.score() && total < best.totalCost()))
          best =
              new Plan(
                  List.copyOf(stops),
                  total,
                  activityCost,
                  transportTotal,
                  end - START_MINUTE,
                  end,
                  score,
                  List.of(
                      "Demonstration only: activity prices, opening windows, low-walking labels and"
                          + " availability are sample data.",
                      "Starts and returns to the sample Bharatpur base at 08:00. This is a one-day"
                          + " local plan; flights and accommodation are excluded.",
                      "Travel estimates use straight-line distances × 1.4, an assumed 18 km/h and"
                          + " NPR 80/km. They are not road directions or live traffic.",
                      "Transport estimate assumes one vehicle for the group; actual capacity and"
                          + " fares require confirmation.",
                      "No live weather, wildlife sightings, operator bookings or AI service is"
                          + " connected."));
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
            || departure > START_MINUTE + p.hours() * 60
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
