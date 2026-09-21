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
  void multiDayTripSurvivesSavingAndRecovery() {
    Trip trip =
        service.create(
            new Preferences("2026-10-10", 2, 18000, 6, "bird", "include", false, 3, "09:00"));
    assertEquals(3, service.get(trip.id()).plan().days().size());
    service.status(trip.plan().stops().getFirst().activity().id(), false);
    Recovery recovery = service.recovery(trip.id());
    assertEquals(3, recovery.plan().days().size());
    Trip accepted = service.accept(trip.id(), recovery.basedOnRevision(), recovery.planToken());
    assertEquals("09:00", accepted.preferences().startTime());
    assertTrue(accepted.affectedIds().isEmpty());
  }

  @Test
  void legacyPreferencesAndPlansStillLoad() {
    var json = new tools.jackson.databind.ObjectMapper();
    Preferences p =
        json.readValue(
            "{\"date\":\"2026-10-10\",\"people\":2,\"budget\":6500,\"hours\":6,\"focus\":\"bird\",\"culture\":\"optional\",\"lowWalking\":false}",
            Preferences.class);
    assertEquals(1, p.days());
    assertEquals("08:00", p.startTime());
    Plan plan =
        json.readValue(
            "{\"stops\":[],\"totalCost\":0,\"activityCost\":0,\"transportCost\":0,\"totalMinutes\":0,\"returnMinute\":480,\"score\":0,\"assumptions\":[]}",
            Plan.class);
    assertTrue(plan.days().isEmpty());
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
