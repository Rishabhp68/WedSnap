import Image from "next/image";
import type { TimelineMoment } from "@/generated/prisma/client";
import { Reveal } from "@/components/motion/reveal";

export function OurStory({ moments }: { moments: TimelineMoment[] }) {
  if (moments.length === 0) return null;

  return (
    <section id="our-story" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-accent-foreground/70">
            Our Story
          </p>
          <h2 className="font-display mt-3 text-center text-3xl sm:text-4xl">
            Every love story is beautiful, but ours is our favorite
          </h2>
        </Reveal>

        <ol className="relative mt-16 space-y-12 border-l border-border/80 pl-8 sm:pl-10">
          {moments.map((moment, i) => (
            <Reveal key={moment.id} delay={i * 0.05} from="right">
              <li className="relative">
                <span className="absolute -left-[calc(2rem+5px)] top-1.5 size-2.5 rounded-full bg-accent ring-4 ring-accent/20 sm:-left-[calc(2.5rem+5px)]" />
                {moment.imageUrl ? (
                  <div className="mb-4 overflow-hidden rounded-2xl">
                    <Image
                      src={moment.imageUrl}
                      alt={moment.title}
                      width={640}
                      height={420}
                      className="h-48 w-full object-cover sm:h-64"
                    />
                  </div>
                ) : null}
                <h3 className="font-display text-xl text-foreground sm:text-2xl">{moment.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {moment.description}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
