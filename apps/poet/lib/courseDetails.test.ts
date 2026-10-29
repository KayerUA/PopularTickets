import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COURSE_DETAILS, COURSE_SEO } from "./courseDetails";
import { buildCourseJsonLd } from "./poetJsonLd";
import { CourseFacts } from "@/components/CourseFacts";
import ru from "@/messages/ru.json";
import uk from "@/messages/uk.json";
import pl from "@/messages/pl.json";

describe("course capacity", () => {
  it.each(["acting", "improv"] as const)("shows the confirmed limit of 12 for %s in text and schema", (course) => {
    const schema = buildCourseJsonLd({ name: course, description: "Course", url: `https://www.popularpoet.pl/ru/kursy/${course}`, providerUrl: "https://www.popularpoet.pl/ru", inLanguage: "ru", courseSlug: course });
    expect(schema.hasCourseInstance).toMatchObject({ maximumAttendeeCapacity: 12 });
    expect(COURSE_DETAILS[course]).toMatchObject({ groupSize: 12, trialPrice: 100, pricePerBlock: 590, lessonsPerBlock: 4 });
    for (const [locale, messages] of [["ru", ru], ["uk", uk], ["pl", pl]] as const) {
      const html = renderToStaticMarkup(createElement(CourseFacts, { slug: course, locale }));
      expect(html).toMatch(/(?:до|do) 12 (?:человек|людей|osób)/);
      expect(messages.CoursePage.programs[course].group).toContain("12");
      expect(messages.metadata.description).toContain("12");
      expect(COURSE_SEO[locale].improv.description).toContain("12");
    }
  });
});
