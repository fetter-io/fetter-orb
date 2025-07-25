import Image from "next/image";
import clsx from "clsx";

export function LandingFeature({
  title,
  description,
  imageSrc,
  reverse = false,
}: {
  title: string;
  description: string;
  imageSrc: string;
  reverse?: boolean;
}) {
  return (
    <section
      className={clsx(
        "flex flex-col md:flex-row items-center justify-between gap-10 pt-12 pb-24 px-12",
        reverse && "md:flex-row-reverse",
      )}
    >
      <div className="md:w-1/3 text-zinc-300">
        <h2 className="text-3xl font-bold mb-4 text-zinc-500">{title}</h2>
        <p className="text-l text-zinc-600">{description}</p>
      </div>
      <div className="md:w-1/2 flex justify-center">
        <Image
          src={imageSrc}
          alt={title}
          width={400}
          height={400}
          className="rounded-lg shadow-xl"
        />
      </div>
    </section>
  );
}
