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
              "https://ntb.gov.np/bharatpur"),
          new Activity(
              "devghat",
              "Devghat heritage walk",
              "Devghat pilgrimage area · approximate",
              "culture",
              27.7474,
              84.4262,
              90,
              250,
              420,
              1020,
              false,
              "Explore the Devghat pilgrimage area near the river confluence. This sample walking"
                  + " visit uses demonstration pricing and hours; confirm access locally and"
                  + " respect religious activities.",
              "https://ntb.gov.np/en/devghat"),
          new Activity(
              "maulakalika",
              "Maula Kalika Temple hike",
              "Gaindakot · near Bharatpur · approximate",
              "culture",
              27.7276,
              84.4086,
              180,
              300,
              420,
              1020,
              false,
              "A sample hill walk to Maula Kalika Temple in neighbouring Gaindakot. Walking time"
                  + " and cost are estimates; this plan does not include a cable-car ticket."
                  + " Confirm the route and access before visiting.",
              "https://www.maulakalika.org.np/"),
          new Activity(
              "meghauli",
              "Meghauli nature outing",
              "Meghauli, western Chitwan · approximate area",
              "nature",
              27.5770,
              84.2280,
              150,
              1200,
              480,
              1020,
              false,
              "A sample guided nature outing around Meghauli. The destination is real, but this is"
                  + " not a booked safari. Arrange an authorised guide and confirm any permits and"
                  + " entry fees separately; wildlife sightings are not guaranteed.",
              "https://ntb.gov.np/meghauli"),
          new Activity(
              "sauraha-riverfront",
              "Sauraha riverfront stroll",
              "Sauraha, Ratnanagar · approximate riverfront",
              "nature",
              27.5756,
              84.4931,
              75,
              250,
              480,
              1020,
              false,
              "A sample stroll by the Rapti River at Sauraha, a neighbouring Chitwan destination."
                  + " Stay in designated visitor areas and follow local wildlife guidance. Prices"
                  + " and opening windows are demonstration assumptions, not verified fees.",
              "https://ntb.gov.np/sauraha"));

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
