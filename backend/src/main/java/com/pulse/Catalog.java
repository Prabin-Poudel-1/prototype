package com.pulse;

import static com.pulse.Models.*;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class Catalog {
  public static final double START_LAT = 27.6832, START_LNG = 84.4288;
  // Sample experiences at approximate geographic anchors. These are NOT real operator listings.
  private final List<Activity> activities =
      List.of(
          new Activity(
              "narayani-birds",
              "Riverside birdwatching",
              "Narayani riverfront",
              "bird",
              27.6990,
              84.4180,
              75,
              450,
              360,
              1020,
              true,
              "A sample gentle birdwatching session beside the river. Species sightings are never"
                  + " guaranteed.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "beeshazari",
              "Wetland birdwatching",
              "Beeshazari area",
              "bird",
              27.6180,
              84.4730,
              120,
              800,
              420,
              960,
              false,
              "A sample guided wetland outing for visitors who can walk on uneven paths.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "riverside-nature",
              "Narayani nature walk",
              "Narayani riverfront",
              "nature",
              27.7050,
              84.4220,
              60,
              200,
              420,
              1080,
              true,
              "A short sample nature walk with rest breaks; accessibility has not been field"
                  + " verified.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "community-birds",
              "Community birdwatching",
              "Bharatpur south · sample meeting point",
              "bird",
              27.6560,
              84.4200,
              90,
              550,
              360,
              1020,
              true,
              "A sample alternative birdwatching session. This is a demo provider, not a bookable"
                  + " business.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "food",
              "Local flavours",
              "Bharatpur centre",
              "food",
              27.6860,
              84.4300,
              60,
              450,
              660,
              1020,
              true,
              "A sample lunch stop. Dietary requirements must be confirmed with a real provider.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "culture",
              "Meet local traditions",
              "Bharatpur · sample venue",
              "culture",
              27.6740,
              84.4270,
              75,
              500,
              540,
              1020,
              true,
              "A sample cultural experience to demonstrate optional interests; venue and"
                  + " availability are fictional.",
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "patihani",
              "Riverside nature afternoon",
              "Patihani area · approximate",
              "nature",
              27.5790,
              84.3650,
              90,
              600,
              480,
              1020,
              false,
              "A sample longer excursion for visitors with additional time and transport budget.",
              "https://ntb.gov.np/bharatpur"));

  public List<Activity> all() {
    return activities;
  }

  public Activity get(String id) {
    return activities.stream()
        .filter(a -> a.id().equals(id))
        .findFirst()
        .orElseThrow(() -> new IllegalArgumentException("Unknown activity."));
  }
}
