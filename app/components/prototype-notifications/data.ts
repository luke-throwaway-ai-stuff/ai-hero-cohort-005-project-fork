/**
 * PROTOTYPE — throwaway fake data for the in-app notification UX prototype.
 *
 * Not wired to Knock, the database, or the trigger seam. Every body below is
 * hand-written from the copy in the catalogue decision (issue #3) so the shapes
 * (actor, wording, timestamp, type) can be judged in the real shell.
 */

import { UserRole } from "~/db/schema";

export type PrototypeNotificationType =
  | "refund-requested"
  | "refund-decided"
  | "seat-claimed"
  | "lesson-question"
  | "comment-reply"
  | "course-availability-changed";

export interface PrototypeNotification {
  id: string;
  type: PrototypeNotificationType;
  actorName: string;
  actorAvatarUrl: string | null;
  /** Full rendered sentence. The actor's name is bolded by the UI when present. */
  body: string;
  /** Where the real feed client would send the user. */
  link: string;
  linkLabel: string;
  /** Deterministic stand-in for a timestamp. */
  minutesAgo: number;
  /** `read` drives the row's styling; `seen` drives the bell count. */
  read: boolean;
  seen: boolean;
}

export type FeedKey = "student" | "instructor" | "admin" | "team-admin";

export function feedKeyFor(
  role: UserRole | null,
  isTeamAdmin: boolean
): FeedKey | null {
  if (!role) return null;
  if (isTeamAdmin) return "team-admin";
  if (role === UserRole.Admin) return "admin";
  if (role === UserRole.Instructor) return "instructor";
  return "student";
}

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;

const dataVis = "Practical Data Visualisation";
const dataVisSlug = "practical-data-visualisation";
const dataVisLesson = "Choosing the right chart";
const tsCourse = "Introduction to TypeScript";
const tsSlug = "introduction-to-typescript";
const dockerCourse = "Shipping with Docker and Kubernetes";

const student: PrototypeNotification[] = [
  {
    id: "s1",
    type: "comment-reply",
    actorName: "Sarah Chen",
    actorAvatarUrl: avatar("sarah"),
    body: `Sarah Chen replied to your comment in “${dataVisLesson}” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/42#comment-318`,
    linkLabel: "Open discussion",
    minutesAgo: 2,
    read: false,
    seen: false,
  },
  {
    id: "s2",
    type: "course-availability-changed",
    actorName: "Marcus Johnson",
    actorAvatarUrl: avatar("marcus"),
    body: `${dockerCourse} is available again.`,
    link: "/courses/shipping-with-docker-and-kubernetes",
    linkLabel: "Open course",
    minutesAgo: 35,
    read: false,
    seen: false,
  },
  {
    id: "s3",
    type: "refund-decided",
    actorName: "Alex Rivera",
    actorAvatarUrl: avatar("alex"),
    body: `Your refund for “Sound Design Fundamentals” was approved.`,
    link: "/settings",
    linkLabel: "View refund",
    minutesAgo: 190,
    read: false,
    seen: false,
  },
  {
    id: "s4",
    type: "comment-reply",
    actorName: "Priya Nair",
    actorAvatarUrl: avatar("priya"),
    body: `Priya Nair replied to your comment in “Reading a chart at a glance” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/44#comment-301`,
    linkLabel: "Open discussion",
    minutesAgo: 320,
    read: true,
    seen: true,
  },
  {
    id: "s5",
    type: "comment-reply",
    actorName: "James Park",
    actorAvatarUrl: avatar("james"),
    body: `James Park replied to your comment in “Colour and contrast” — ${tsCourse}.`,
    link: `/courses/${tsSlug}/lessons/12#comment-288`,
    linkLabel: "Open discussion",
    minutesAgo: 1320,
    read: false,
    seen: true,
  },
  {
    id: "s6",
    type: "course-availability-changed",
    actorName: "Sarah Chen",
    actorAvatarUrl: avatar("sarah"),
    body: `“Design Systems with Tailwind” is no longer available.`,
    link: "/courses/design-systems-with-tailwind",
    linkLabel: "Open course",
    minutesAgo: 1560,
    read: true,
    seen: true,
  },
  {
    id: "s7",
    type: "comment-reply",
    actorName: "Olivia Martinez",
    actorAvatarUrl: null,
    body: `Olivia Martinez replied to your comment in “Small multiples” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/51#comment-240`,
    linkLabel: "Open discussion",
    minutesAgo: 2880,
    read: true,
    seen: true,
  },
  {
    id: "s8",
    type: "comment-reply",
    actorName: "Liam Thompson",
    actorAvatarUrl: avatar("liam"),
    body: `Liam Thompson replied to your comment in “Picking a palette” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/47#comment-221`,
    linkLabel: "Open discussion",
    minutesAgo: 4320,
    read: true,
    seen: true,
  },
  {
    id: "s9",
    type: "course-availability-changed",
    actorName: "Priya Nair",
    actorAvatarUrl: avatar("priya"),
    body: `${tsCourse} is available again.`,
    link: `/courses/${tsSlug}`,
    linkLabel: "Open course",
    minutesAgo: 5760,
    read: true,
    seen: true,
  },
  {
    id: "s10",
    type: "comment-reply",
    actorName: "Sophia Davis",
    actorAvatarUrl: null,
    body: `Sophia Davis replied to your comment in “Labelling without clutter” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/49#comment-198`,
    linkLabel: "Open discussion",
    minutesAgo: 8640,
    read: true,
    seen: true,
  },
];

const instructor: PrototypeNotification[] = [
  {
    id: "i1",
    type: "lesson-question",
    actorName: "Emma Wilson",
    actorAvatarUrl: avatar("emma"),
    body: `Emma Wilson asked a question in “${dataVisLesson}” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/42#comment-317`,
    linkLabel: "Answer the question",
    minutesAgo: 4,
    read: false,
    seen: false,
  },
  {
    id: "i2",
    type: "lesson-question",
    actorName: "James Park",
    actorAvatarUrl: avatar("james"),
    body: `James Park asked a question in “Reading a chart at a glance” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/44#comment-310`,
    linkLabel: "Answer the question",
    minutesAgo: 50,
    read: false,
    seen: false,
  },
  {
    id: "i3",
    type: "comment-reply",
    actorName: "Olivia Martinez",
    actorAvatarUrl: null,
    body: `Olivia Martinez replied to your comment in “Colour and contrast” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/47#comment-302`,
    linkLabel: "Open discussion",
    minutesAgo: 125,
    read: false,
    seen: false,
  },
  {
    id: "i4",
    type: "lesson-question",
    actorName: "Liam Thompson",
    actorAvatarUrl: avatar("liam"),
    body: `Liam Thompson asked a question in “Small multiples” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/51#comment-287`,
    linkLabel: "Answer the question",
    minutesAgo: 360,
    read: true,
    seen: true,
  },
  {
    id: "i5",
    type: "comment-reply",
    actorName: "Sophia Davis",
    actorAvatarUrl: null,
    body: `Sophia Davis replied to your comment in “Picking a palette” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/49#comment-260`,
    linkLabel: "Open discussion",
    minutesAgo: 1500,
    read: true,
    seen: true,
  },
  {
    id: "i6",
    type: "lesson-question",
    actorName: "Noah Blackwood",
    actorAvatarUrl: avatar("noah-blackwood"),
    body: `Noah Blackwood asked a question in “Labelling without clutter” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/49#comment-244`,
    linkLabel: "Answer the question",
    minutesAgo: 2900,
    read: true,
    seen: true,
  },
  {
    id: "i7",
    type: "lesson-question",
    actorName: "Ava Nakamura",
    actorAvatarUrl: avatar("ava-nakamura"),
    body: `Ava Nakamura asked a question in “Choosing the right chart” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/42#comment-230`,
    linkLabel: "Answer the question",
    minutesAgo: 4400,
    read: true,
    seen: true,
  },
  {
    id: "i8",
    type: "comment-reply",
    actorName: "Emma Wilson",
    actorAvatarUrl: avatar("emma"),
    body: `Emma Wilson replied to your comment in “Reading a chart at a glance” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/44#comment-205`,
    linkLabel: "Open discussion",
    minutesAgo: 7200,
    read: true,
    seen: true,
  },
  {
    id: "i9",
    type: "lesson-question",
    actorName: "Isla Fernandes",
    actorAvatarUrl: null,
    body: `Isla Fernandes asked a question in “Colour and contrast” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/47#comment-190`,
    linkLabel: "Answer the question",
    minutesAgo: 11520,
    read: true,
    seen: true,
  },
  {
    id: "i10",
    type: "comment-reply",
    actorName: "James Park",
    actorAvatarUrl: avatar("james"),
    body: `James Park replied to your comment in “Small multiples” — ${dataVis}.`,
    link: `/courses/${dataVisSlug}/lessons/51#comment-170`,
    linkLabel: "Open discussion",
    minutesAgo: 17280,
    read: true,
    seen: true,
  },
];

const admin: PrototypeNotification[] = [
  {
    id: "a1",
    type: "refund-requested",
    actorName: "Emma Wilson",
    actorAvatarUrl: avatar("emma"),
    body: `Emma Wilson requested a refund on ${tsCourse} — $79.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 8,
    read: false,
    seen: false,
  },
  {
    id: "a2",
    type: "refund-requested",
    actorName: "James Park",
    actorAvatarUrl: avatar("james"),
    body: `James Park requested a refund on ${dataVis} — $129.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 40,
    read: false,
    seen: false,
  },
  {
    id: "a3",
    type: "refund-requested",
    actorName: "Olivia Martinez",
    actorAvatarUrl: null,
    body: `Olivia Martinez requested a refund on “Design Systems with Tailwind” — $99.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 240,
    read: false,
    seen: false,
  },
  {
    id: "a4",
    type: "refund-requested",
    actorName: "Liam Thompson",
    actorAvatarUrl: avatar("liam"),
    body: `Liam Thompson requested a refund on ${dockerCourse} — $149.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 480,
    read: true,
    seen: true,
  },
  {
    id: "a5",
    type: "refund-requested",
    actorName: "Sophia Davis",
    actorAvatarUrl: null,
    body: `Sophia Davis requested a refund on ${tsCourse} — $79.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 1440,
    read: true,
    seen: true,
  },
  {
    id: "a6",
    type: "refund-requested",
    actorName: "Noah Blackwood",
    actorAvatarUrl: avatar("noah-blackwood"),
    body: `Noah Blackwood requested a refund on ${dataVis} — $129.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 2880,
    read: true,
    seen: true,
  },
  {
    id: "a7",
    type: "refund-requested",
    actorName: "Ava Nakamura",
    actorAvatarUrl: avatar("ava-nakamura"),
    body: `Ava Nakamura requested a refund on ${tsCourse} — $79.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 5760,
    read: true,
    seen: true,
  },
  {
    id: "a8",
    type: "refund-requested",
    actorName: "Isla Fernandes",
    actorAvatarUrl: null,
    body: `Isla Fernandes requested a refund on “Sound Design Fundamentals” — $59.`,
    link: "/admin/refunds",
    linkLabel: "Review request",
    minutesAgo: 8640,
    read: true,
    seen: true,
  },
];

const teamAdmin: PrototypeNotification[] = [
  {
    id: "t1",
    type: "seat-claimed",
    actorName: "Emma Wilson",
    actorAvatarUrl: avatar("emma"),
    body: `Emma Wilson claimed a seat on ${tsCourse}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 12,
    read: false,
    seen: false,
  },
  {
    id: "t2",
    type: "seat-claimed",
    actorName: "James Park",
    actorAvatarUrl: avatar("james"),
    body: `James Park claimed a seat on ${dataVis}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 65,
    read: false,
    seen: false,
  },
  {
    id: "t3",
    type: "seat-claimed",
    actorName: "Olivia Martinez",
    actorAvatarUrl: null,
    body: `Olivia Martinez claimed a seat on ${tsCourse}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 180,
    read: false,
    seen: false,
  },
  {
    id: "t4",
    type: "seat-claimed",
    actorName: "Liam Thompson",
    actorAvatarUrl: avatar("liam"),
    body: `Liam Thompson claimed a seat on ${dockerCourse}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 540,
    read: true,
    seen: true,
  },
  {
    id: "t5",
    type: "refund-decided",
    actorName: "Alex Rivera",
    actorAvatarUrl: avatar("alex"),
    body: `Your refund for “Team Licence — 10 seats” was approved.`,
    link: "/settings",
    linkLabel: "View refund",
    minutesAgo: 1440,
    read: true,
    seen: true,
  },
  {
    id: "t6",
    type: "seat-claimed",
    actorName: "Sophia Davis",
    actorAvatarUrl: null,
    body: `Sophia Davis claimed a seat on ${dataVis}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 4320,
    read: true,
    seen: true,
  },
  {
    id: "t7",
    type: "seat-claimed",
    actorName: "Noah Blackwood",
    actorAvatarUrl: avatar("noah-blackwood"),
    body: `Noah Blackwood claimed a seat on ${tsCourse}.`,
    link: "/team",
    linkLabel: "View team seats",
    minutesAgo: 7200,
    read: true,
    seen: true,
  },
];

export function mockFeed(key: FeedKey): PrototypeNotification[] {
  if (key === "student") return student.map((n) => ({ ...n }));
  if (key === "instructor") return instructor.map((n) => ({ ...n }));
  if (key === "admin") return admin.map((n) => ({ ...n }));
  return teamAdmin.map((n) => ({ ...n }));
}
