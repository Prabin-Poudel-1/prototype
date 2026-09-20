package com.pulse;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Local demo inbox only. Add authentication and operator roles before public deployment. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {
  private final JdbcTemplate db;

  public ReportController(JdbcTemplate db) {
    this.db = db;
  }

  public record Request(String category, String location, String description) {}

  public record Report(
      String id, String category, String location, String description, String createdAt) {}

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Report create(@RequestBody Request request) {
    if (request == null
        || request.category() == null
        || !Set.of("transport", "place", "lost-item", "app", "other")
            .contains(request.category())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid problem category.");
    }
    String location = request.location() == null ? "" : request.location().trim();
    String description = request.description() == null ? "" : request.description().trim();
    if (location.length() > 200 || description.length() < 10 || description.length() > 2000) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Use 10–2000 characters for the description and at most 200 for the location.");
    }
    Report report =
        new Report(
            UUID.randomUUID().toString(),
            request.category(),
            location,
            description,
            Instant.now().toString());
    db.update(
        "INSERT INTO problem_reports (id, category, location, description, created_at) VALUES (?,"
            + " ?, ?, ?, ?)",
        report.id(),
        report.category(),
        report.location(),
        report.description(),
        report.createdAt());
    return report;
  }

  @GetMapping
  public List<Report> list() {
    return db.query(
        "SELECT * FROM problem_reports ORDER BY created_at DESC LIMIT 100",
        (rs, row) ->
            new Report(
                rs.getString("id"),
                rs.getString("category"),
                rs.getString("location"),
                rs.getString("description"),
                rs.getString("created_at")));
  }
}
