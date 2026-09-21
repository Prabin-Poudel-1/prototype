package com.pulse;

import java.util.List;

public final class Models {
  private Models() {}

  public record Activity(
      String id,
      String name,
      String area,
      String kind,
      double lat,
      double lng,
      int duration,
      int pricePerPerson,
      int openMinute,
      int closeMinute,
      boolean lowWalking,
      String description,
      String source) {}

  public record ActivityView(Activity activity, boolean available, String updatedAt) {}

  public record Preferences(
      String date,
      int people,
      int budget,
      int hours,
      String focus,
      String culture,
      boolean lowWalking,
      Integer days,
      String startTime) {
    public Preferences {
      if (days == null) days = 1;
      if (startTime == null) startTime = "08:00";
    }

    public Preferences(
        String date,
        int people,
        int budget,
        int hours,
        String focus,
        String culture,
        boolean lowWalking) {
      this(date, people, budget, hours, focus, culture, lowWalking, 1, "08:00");
    }
  }

  public record Stop(
      Activity activity, int arrival, int departure, int travelMinutes, int activityCost) {}

  public record Plan(
      List<Stop> stops,
      int totalCost,
      int activityCost,
      int transportCost,
      int totalMinutes,
      int returnMinute,
      int score,
      List<String> assumptions,
      List<DayPlan> days) {
    public Plan {
      if (days == null) days = List.of();
    }

    public Plan(
        List<Stop> stops,
        int totalCost,
        int activityCost,
        int transportCost,
        int totalMinutes,
        int returnMinute,
        int score,
        List<String> assumptions) {
      this(
          stops,
          totalCost,
          activityCost,
          transportCost,
          totalMinutes,
          returnMinute,
          score,
          assumptions,
          List.of());
    }
  }

  public record DayPlan(int day, String date, Plan plan) {}

  public record Trip(
      String id, Preferences preferences, Plan plan, int revision, List<String> affectedIds) {}

  public record Recovery(
      String tripId,
      int basedOnRevision,
      Plan plan,
      int retainedActivities,
      int changedActivities,
      String planToken) {}

  public record StatusRequest(boolean available) {}

  public record AcceptRequest(int basedOnRevision, String planToken) {}
}
