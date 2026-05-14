"use client";

import { motion } from "framer-motion";
import { EventCard, type EventCardProps } from "@/components/EventCard";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 28 },
  },
};

export function HomeEventsGrid({ events }: { events: EventCardProps[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {events.map((ev) => (
        <motion.div key={ev.slug} variants={item} className="h-full">
          <EventCard {...ev} />
        </motion.div>
      ))}
    </motion.div>
  );
}
