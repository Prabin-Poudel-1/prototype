package com.pulse;

import static com.pulse.Models.*;

import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PulseController {
  private final TripService service;

  public PulseController(TripService service) {
    this.service = service;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "mode", "local prototype", "planner", "constraint search");
  }

  @GetMapping("/activities")
  public List<ActivityView> activities() {
    return service.activities();
  }

  @PostMapping("/trips")
  public Trip create(@RequestBody Preferences preferences) {
    return service.create(preferences);
  }

  @GetMapping("/trips/{id}")
  public Trip get(@PathVariable String id) {
    return service.get(id);
  }

  @PostMapping("/trips/{id}/alternatives")
  public Recovery alternatives(@PathVariable String id) {
    return service.recovery(id);
  }

  @PostMapping("/trips/{id}/accept")
  public Trip accept(@PathVariable String id, @RequestBody AcceptRequest request) {
    return service.accept(id, request.basedOnRevision(), request.planToken());
  }

  // Local prototype endpoint. Authentication and operator authorization are required before
  // deployment.
  @PatchMapping("/activities/{id}/status")
  public List<ActivityView> status(@PathVariable String id, @RequestBody StatusRequest request) {
    return service.status(id, request.available());
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<Map<String, String>> invalid(IllegalArgumentException e) {
    return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
  }
}
