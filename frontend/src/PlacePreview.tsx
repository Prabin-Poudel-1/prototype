import { useState } from "react";
import { Camera, ChevronDown, Star } from "lucide-react";
import photos from "./placePhotos.json";
import type { Activity } from "./types";

type Sample = {
  photo: keyof typeof photos;
  context: string;
  rating: number;
  review: string;
};
const examples: Record<string, Sample> = {
  devghat: {
    photo: "devghat",
    context:
      "Destination photo · Devghat pilgrimage area; approximate map anchor",
    rating: 4,
    review:
      "I liked the combination of cultural interest and river scenery. I would ask about local customs before visiting.",
  },
  maulakalika: {
    photo: "maulakalika",
    context: "Destination photo · Maula Kalika Temple, Gaindakot (2011)",
    rating: 5,
    review:
      "The temple visit gave my day a clear focus. I would leave enough time for the climb and check the route before setting out.",
  },
  meghauli: {
    photo: "meghauli",
    context: "Area wildlife photo · Meghauli; sightings are not guaranteed",
    rating: 4,
    review:
      "I would make this the main nature outing of the day and confirm the guide, permits and return transport in advance.",
  },
  "sauraha-riverfront": {
    photo: "sauraha",
    context: "Destination photo · Rapti River at Sauraha (2008)",
    rating: 4,
    review:
      "The riverfront made a pleasant stop in my sample plan. I would check local advice and allow time for the return journey.",
  },
  "narayani-birds": {
    photo: "kingfisher",
    context:
      "Illustrative birdwatching photo · Chitwan kingfisher; sightings are not guaranteed",
    rating: 4,
    review:
      "I enjoyed the riverside setting. Next time I would ask the guide what to bring for birdwatching before leaving.",
  },
  beeshazari: {
    photo: "lake",
    context: "Destination photo · Beeshazari Lake",
    rating: 5,
    review:
      "The lake was the highlight of my sample itinerary. I would leave enough time to pause and enjoy the surroundings.",
  },
  "riverside-nature": {
    photo: "river",
    context: "Area photo · Narayani River, not a verified walking route",
    rating: 4,
    review:
      "A relaxing break between activities. I would check the walking conditions and meeting point before visiting.",
  },
  "community-birds": {
    photo: "egret",
    context:
      "Illustrative birdwatching photo · egret at Kumal Lake, not this sample venue",
    rating: 4,
    review:
      "I liked having birdwatching as the focus of the day. A clear meeting point would make the experience easier to organize.",
  },
  food: {
    photo: "food",
    context:
      "Illustrative cuisine photo · not this sample restaurant or its menu",
    rating: 4,
    review:
      "The food stop made a welcome break. I would confirm dietary preferences and what is included in the price in advance.",
  },
  culture: {
    photo: "culture",
    context:
      "Illustrative photo · Sauraha performance in 2018, not this sample venue",
    rating: 5,
    review:
      "The cultural stop added variety to my trip. I would ask the host about the activity and photography etiquette beforehand.",
  },
  patihani: {
    photo: "sunset",
    context:
      "Illustrative afternoon outing · Rapti River sunset, not a verified Patihani viewpoint",
    rating: 4,
    review:
      "I enjoyed ending the day outdoors. I would allow extra time for the return journey.",
  },
};

export default function PlacePreview({ activity }: { activity: Activity }) {
  const sample = examples[activity.id];
  const [failed, setFailed] = useState(false);
  if (!sample)
    return (
      <p className="place-empty">
        Photos and reviews have not been added for this place yet.
      </p>
    );
  const photo = photos[sample.photo];
  return (
    <section
      className="place-preview"
      aria-label={`Photos and sample review for ${activity.name}`}
    >
      <figure className="place-photo">
        {failed ? (
          <div className="place-photo-fallback">
            <Camera size={24} />
            <span>
              Photo unavailable. View the original using the credit link below.
            </span>
          </div>
        ) : (
          <a
            href={photo.src}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open photo: ${photo.caption}`}
          >
            <img
              src={photo.src}
              alt={photo.caption}
              loading="lazy"
              width={1280}
              height={720}
              onError={() => setFailed(true)}
            />
            <span className="place-photo-label">
              <Camera size={14} /> View photo
            </span>
          </a>
        )}
        <figcaption>
          <span>{sample.context}</span>
          <small>
            <a href={photo.source} target="_blank" rel="noreferrer">
              Photo: {photo.author}
            </a>{" "}
            ·{" "}
            <a href={photo.license} target="_blank" rel="noreferrer">
              {photo.licenseLabel}
            </a>{" "}
            · cropped in preview
          </small>
        </figcaption>
      </figure>
      <details className="place-reviews">
        <summary>
          <span>
            <Star size={15} aria-hidden="true" /> Sample review
          </span>
          <span className="place-sample-score">
            {sample.rating}/5 · fictional{" "}
            <ChevronDown size={16} aria-hidden="true" />
          </span>
        </summary>
        <div className="place-review-body">
          <p className="place-review-notice">
            Demo content — not submitted by a real visitor. No verified visitor
            reviews yet.
          </p>
          <div className="place-review-author">
            <strong>Sample traveller</strong>
            <span aria-label={`${sample.rating} out of 5 sample stars`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={14}
                  fill={i < sample.rating ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              ))}
            </span>
          </div>
          <p>{sample.review}</p>
        </div>
      </details>
    </section>
  );
}
