package com.pulse;

import static com.pulse.Models.*;

import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

@Service
public class TripService {
  private final Catalog catalog;
  private final Planner planner;
  private final JdbcTemplate db;
  private final ObjectMapper json;

  public TripService(Catalog catalog, Planner planner, JdbcTemplate db, ObjectMapper json) {
    this.catalog = catalog;
    this.planner = planner;
    this.db = db;
    this.json = json;
  }

  public List<ActivityView> activities() {
    return catalog.all().stream()
        .map(
            a -> {
              var rows =
                  db.queryForList(
                      "SELECT available, updated_at FROM activity_status WHERE id=?", a.id());
              return rows.isEmpty()
                  ? new ActivityView(a, true, "Sample catalogue")
                  : new ActivityView(
                      a,
                      (Boolean) rows.getFirst().get("available"),
                      rows.getFirst().get("updated_at").toString());
            })
        .toList();
  }

  private List<Activity> available() {
    return activities().stream()
        .filter(ActivityView::available)
        .map(ActivityView::activity)
        .toList();
  }

  public Trip create(Preferences p) {
    Plan plan =
        planner
            .plan(p, available(), Set.of())
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_CONTENT,
                        "No sample itinerary fits every requirement. Increase the time or budget,"
                            + " or change an optional preference."));
    String id = UUID.randomUUID().toString();
    db.update(
        "INSERT INTO trips(id,preferences,plan,revision) VALUES (?,?,?,1)",
        id,
        json.writeValueAsString(p),
        json.writeValueAsString(plan));
    return get(id);
  }

  public Trip get(String id) {
    var rows = db.queryForList("SELECT * FROM trips WHERE id=?", id);
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trip not found.");
    var row = rows.getFirst();
    Preferences p = json.readValue(row.get("preferences").toString(), Preferences.class);
    Plan plan = json.readValue(row.get("plan").toString(), Plan.class);
    Set<String> unavailable =
        new HashSet<>(
            activities().stream().filter(a -> !a.available()).map(a -> a.activity().id()).toList());
    return new Trip(
        id,
        p,
        plan,
        ((Number) row.get("revision")).intValue(),
        plan.stops().stream().map(s -> s.activity().id()).filter(unavailable::contains).toList());
  }

  public Recovery recovery(String id) {
    Trip trip = get(id);
    Set<String> preserve =
        new HashSet<>(trip.plan().stops().stream().map(s -> s.activity().id()).toList());
    Plan next =
        planner
            .plan(trip.preferences(), available(), preserve)
            .orElseThrow(
                () ->
                    new ResponseStatusException(
                        HttpStatus.UNPROCESSABLE_CONTENT,
                        "No replacement preserves your requirements in the sample catalogue. Your"
                            + " original itinerary is saved; try a larger budget or longer day."));
    int retained =
        (int) next.stops().stream().filter(s -> preserve.contains(s.activity().id())).count();
    return new Recovery(
        id, trip.revision(), next, retained, trip.plan().stops().size() - retained, token(next));
  }

  private String token(Plan plan) {
    try {
      return java.util.HexFormat.of()
          .formatHex(
              java.security.MessageDigest.getInstance("SHA-256")
                  .digest(
                      json.writeValueAsString(plan)
                          .getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional
  public Trip accept(String id, int revision, String expectedToken) {
    db.queryForList("SELECT id FROM trips WHERE id=? FOR UPDATE", id);
    Trip trip = get(id);
    if (trip.revision() != revision)
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "This trip changed. Preview a fresh alternative.");
    Recovery next = recovery(id);
    if (!next.planToken().equals(expectedToken))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "Availability changed after your preview. Preview a fresh alternative before accepting.");
    db.update(
        "UPDATE trips SET plan=?, revision=revision+1 WHERE id=?",
        json.writeValueAsString(next.plan()),
        id);
    return get(id);
  }

  @Transactional
  public List<ActivityView> status(String id, boolean available) {
    catalog.get(id);
    int n =
        db.update(
            "UPDATE activity_status SET available=?,updated_at=? WHERE id=?",
            available,
            Instant.now().toString(),
            id);
    if (n == 0)
      db.update(
          "INSERT INTO activity_status(id,available,updated_at) VALUES (?,?,?)",
          id,
          available,
          Instant.now().toString());
    return activities();
  }
}
