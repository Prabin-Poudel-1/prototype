package com.pulse;

import static com.pulse.Models.*;
import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(
    properties = {"spring.datasource.url=jdbc:h2:mem:pulsetest;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
class TripServiceTest {
  @Autowired TripService service;
  @Autowired JdbcTemplate db;

  @BeforeEach
  void reset() {
    db.update("DELETE FROM trips");
    db.update("DELETE FROM activity_status");
  }

  @Test
  void cancellationIsDetectedAndRecoveryRequiresExplicitAcceptance() {
    Trip t = service.create(new Preferences("2026-10-10", 2, 6500, 6, "bird", "optional", false));
    String closed = t.plan().stops().getFirst().activity().id();
    service.status(closed, false);
    Trip affected = service.get(t.id());
    assertTrue(affected.affectedIds().contains(closed));
    assertEquals(t.plan(), affected.plan());
    Recovery next = service.recovery(t.id());
    assertEquals(1, service.get(t.id()).revision());
    Trip accepted = service.accept(t.id(), next.basedOnRevision(), next.planToken());
    assertEquals(2, accepted.revision());
    assertTrue(accepted.affectedIds().isEmpty());
    assertThrows(ResponseStatusException.class, () -> service.accept(t.id(), 1, next.planToken()));
  }

  @Test
  void changedAvailabilityInvalidatesPreview() {
    Trip t = service.create(new Preferences("2026-10-10", 2, 6500, 6, "bird", "optional", false));
    Recovery preview = service.recovery(t.id());
    String closed = preview.plan().stops().getFirst().activity().id();
    service.status(closed, false);
    assertThrows(
        ResponseStatusException.class,
        () -> service.accept(t.id(), preview.basedOnRevision(), preview.planToken()));
    assertEquals(1, service.get(t.id()).revision());
  }
}
