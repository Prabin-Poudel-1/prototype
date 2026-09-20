package com.pulse;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(
    properties = "spring.datasource.url=jdbc:h2:mem:reporttest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
class ReportControllerTest {
  @Autowired ReportController controller;
  @Autowired JdbcTemplate db;

  @Test
  void savesReportAndReturnsItInInbox() {
    var result =
        controller.create(
            new ReportController.Request(
                "transport", " Riverfront ", " Bus did not arrive at the stop. "));
    assertEquals("Riverfront", result.location());
    assertEquals("Bus did not arrive at the stop.", result.description());
    assertTrue(controller.list().contains(result));
    assertEquals(
        1,
        db.queryForObject(
            "SELECT COUNT(*) FROM problem_reports WHERE id = ?", Integer.class, result.id()));
  }

  @Test
  void rejectsInvalidReportsWithoutSaving() {
    int before = db.queryForObject("SELECT COUNT(*) FROM problem_reports", Integer.class);
    assertThrows(
        ResponseStatusException.class,
        () ->
            controller.create(
                new ReportController.Request("invalid", "", "A valid length description")));
    assertThrows(
        ResponseStatusException.class,
        () -> controller.create(new ReportController.Request("app", "", "   ")));
    assertThrows(
        ResponseStatusException.class,
        () ->
            controller.create(
                new ReportController.Request(
                    "app", "x".repeat(201), "A valid length description")));
    assertThrows(
        ResponseStatusException.class,
        () -> controller.create(new ReportController.Request("app", "", "x".repeat(2001))));
    assertEquals(before, db.queryForObject("SELECT COUNT(*) FROM problem_reports", Integer.class));
  }
}
